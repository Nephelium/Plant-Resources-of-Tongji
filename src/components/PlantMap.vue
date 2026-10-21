<script setup lang="ts">
import L from "leaflet";
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import type { PlantFeature } from "../types";
import { plantColor, plantLink } from "../utils/plants";
import { createMapRenderer } from "../utils/mapRenderer";
import AppIcon from "./AppIcon.vue";
const props = withDefaults(
  defineProps<{
    features: PlantFeature[];
    compact?: boolean;
    label?: string;
  }>(),
  { compact: false, label: "校园植物分布地图" },
);
const router = useRouter();
const mapEl = ref<HTMLElement>();
const container = ref<HTMLElement>();
const expandButton = ref<HTMLButtonElement>();
const expanded = ref(false);
const dark = ref(true);
const scrollZoom = ref(false);
const tileError = ref(false);
let map: L.Map | undefined;
let layer: L.FeatureGroup | undefined;
let tiles: L.TileLayer | undefined;
let observer: ResizeObserver | undefined;
let renderTimer: ReturnType<typeof setTimeout> | undefined;
let previousOverflow = "";
const campus: L.LatLngBoundsExpression = [
  [31.2806, 121.4912],
  [31.2892, 121.5038],
];
const resetView = () => {
  if (!map) return;
  const bounds = layer?.getBounds();
  map.fitBounds(bounds?.isValid() ? bounds : campus, {
    padding: [30, 30],
    maxZoom: 18,
    animate: false,
  });
};
function popup(feature: PlantFeature) {
  const info = feature.properties;
  const box = document.createElement("div");
  box.className = "plant-popup";
  const title = document.createElement("strong");
  title.textContent = info.chinese_name || "待补充名称的调查点位";
  const latin = document.createElement("em");
  latin.textContent = info.scientific_name;
  const family = document.createElement("p");
  family.textContent =
    [info.category, info.family].filter(Boolean).join(" · ") || "科属待补充";
  const link = document.createElement("a");
  link.href = router.resolve(plantLink(info.chinese_name)).href;
  link.textContent = "查看植物档案 →";
  link.addEventListener("click", (event) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)
      return;
    event.preventDefault();
    void router.push(plantLink(info.chinese_name));
  });
  box.append(title, latin, family);
  if (info.chinese_name) box.append(link);
  return box;
}
function renderPoints() {
  if (!map) return;
  layer?.remove();
  layer = L.featureGroup();
  const radius =
    props.features.length > 3000 ? 2.5 : props.features.length > 600 ? 3 : 4.5;
  for (const feature of props.features) {
    const [lng, lat] = feature.geometry.coordinates;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const marker = L.circleMarker([lat, lng], {
      radius,
      color: plantColor(feature.properties.category),
      weight: 0.5,
      fillOpacity: 0.85,
    });
    marker.bindPopup(() => popup(feature));
    layer.addLayer(marker);
  }
  layer.addTo(map);
  resetView();
}
async function toggleExpanded() {
  expanded.value = !expanded.value;
  if (expanded.value) {
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    await nextTick();
    expandButton.value?.focus();
  } else {
    document.body.style.overflow = previousOverflow;
    await nextTick();
    expandButton.value?.focus();
  }
  map?.invalidateSize();
}
function onKey(event: KeyboardEvent) {
  if (!expanded.value) return;
  if (event.key === "Escape") {
    event.preventDefault();
    void toggleExpanded();
  }
  if (event.key === "Tab" && container.value) {
    const elements = [
      ...container.value.querySelectorAll<HTMLElement>(
        'button, a[href], input, select, [tabindex="0"]',
      ),
    ].filter((el) => el.offsetParent !== null);
    const first = elements[0],
      last = elements[elements.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    }
    if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }
}
function retryTiles() {
  tileError.value = false;
  tiles?.redraw();
}
onMounted(() => {
  if (!mapEl.value) return;
  map = L.map(mapEl.value, {
    preferCanvas: true,
    renderer: createMapRenderer(),
    scrollWheelZoom: false,
    zoomControl: false,
    zoomSnap: 0.25,
    zoomDelta: 0.5,
    center: [31.28497, 121.49765],
    zoom: 16,
    maxZoom: 21,
  });
  L.control
    .zoom({
      position: "bottomright",
      zoomInTitle: "放大地图",
      zoomOutTitle: "缩小地图",
    })
    .addTo(map);
  L.control.scale({ position: "bottomleft", imperial: false }).addTo(map);
  tiles = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxNativeZoom: 19,
    maxZoom: 21,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
  }).addTo(map);
  tiles.on("tileerror", () => {
    tileError.value = true;
  });
  renderPoints();
  observer = new ResizeObserver(() => map?.invalidateSize());
  observer.observe(mapEl.value);
  document.addEventListener("keydown", onKey);
});
watch(
  () => props.features,
  () => {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(renderPoints, 150);
  },
);
watch(scrollZoom, (value) => {
  if (value) map?.scrollWheelZoom.enable();
  else map?.scrollWheelZoom.disable();
});
onBeforeUnmount(() => {
  clearTimeout(renderTimer);
  observer?.disconnect();
  document.removeEventListener("keydown", onKey);
  if (expanded.value) document.body.style.overflow = previousOverflow;
  // 先移除路径，再销毁 Canvas，防止路径移除时重新排入重绘任务。
  map?.stop();
  layer?.clearLayers();
  layer?.remove();
  layer = undefined;
  map?.remove();
  map = undefined;
});
</script>
<template>
  <div
    ref="container"
    class="plant-map-shell"
    :class="{
      'map-expanded': expanded,
      'map-compact': compact,
      'map-dark': dark,
    }"
    :role="expanded ? 'dialog' : undefined"
    :aria-modal="expanded ? true : undefined"
    :aria-label="expanded ? label : undefined"
  >
    <div class="map-controls">
      <div class="map-theme-switch" role="group" aria-label="地图底色">
        <button
          :class="{ selected: dark }"
          :aria-pressed="dark"
          @click="dark = true"
        >
          <AppIcon name="moon" :size="15" /><span>深色</span>
        </button>
        <button
          :class="{ selected: !dark }"
          :aria-pressed="!dark"
          @click="dark = false"
        >
          <AppIcon name="sun" :size="15" /><span>标准</span>
        </button>
      </div>
      <div class="map-actions">
        <button
          title="显示全部筛选点位"
          aria-label="显示全部筛选点位"
          @click="resetView"
        >
          <AppIcon name="reset" :size="18" />
        </button>
        <button
          ref="expandButton"
          :title="expanded ? '收起地图' : '展开地图'"
          :aria-label="expanded ? '收起地图' : '展开地图'"
          :aria-expanded="expanded"
          @click="toggleExpanded"
        >
          <AppIcon :name="expanded ? 'close' : 'expand'" :size="18" />
        </button>
      </div>
    </div>
    <div ref="mapEl" class="plant-map" :aria-label="label"></div>
    <div v-if="tileError" class="tile-notice" role="status">
      底图暂未加载，植物点位仍可查看。<button @click="retryTiles">
        重新加载
      </button>
    </div>
    <div class="map-caption">
      <span><i></i> 同济大学 · 四平路校区</span
      ><label><input v-model="scrollZoom" type="checkbox" />滚轮缩放</label>
    </div>
  </div>
</template>
<style scoped>
.plant-map-shell {
  position: relative;
  overflow: hidden;
  border-radius: 0 10px 10px 0;
  background: #1b2828;
  min-width: 0;
}
.plant-map {
  height: 550px;
  background: #e9eddf;
  z-index: 0;
}
.map-dark .plant-map {
  background: #182626;
}
.map-dark :deep(.leaflet-tile-pane) {
  filter: invert(1) hue-rotate(170deg) saturate(0.38) brightness(0.82)
    contrast(0.92);
}
.map-controls {
  position: absolute;
  z-index: 500;
  top: 18px;
  right: 18px;
  left: 18px;
  display: flex;
  justify-content: space-between;
  pointer-events: none;
  gap: 12px;
}
.map-controls button {
  pointer-events: auto;
  background: #fffef8;
  border: 0;
  border-radius: 5px;
  min-height: 36px;
  padding: 8px 11px;
  font-size: 11px;
}
.map-theme-switch {
  display: flex;
  background: #fffef8;
  border-radius: 6px;
  padding: 3px;
  box-shadow: 0 2px 12px #0002;
}
.map-theme-switch button {
  min-height: 30px;
  padding: 5px 10px;
}
.map-theme-switch button.selected {
  background: var(--primary);
  color: white;
}
.map-actions {
  display: flex;
  gap: 6px;
}
.map-actions button {
  width: 40px;
  height: 40px;
  box-shadow: 0 2px 12px #0002;
}
.map-caption {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 11px 16px;
  background: var(--surface);
  color: var(--muted);
  gap: 10px;
  font-size: 10px;
}
.map-caption span {
  display: flex;
  align-items: center;
  gap: 7px;
}
.map-caption i {
  display: block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #7e986a;
}
.map-caption label {
  display: flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
}
.map-caption input {
  min-height: 0;
  accent-color: var(--primary);
}
.map-expanded {
  position: fixed;
  inset: 12px;
  z-index: 2000;
  border: 1px solid var(--line);
  border-radius: 12px;
  box-shadow: 0 0 0 40px #14221ddd;
}
.map-expanded .plant-map {
  height: calc(100dvh - 65px);
}
.map-compact {
  border-radius: 10px;
}
.map-compact .plant-map {
  height: 320px;
}
.map-compact.map-expanded .plant-map {
  height: calc(100dvh - 65px);
}
.tile-notice {
  position: absolute;
  left: 14px;
  bottom: 70px;
  right: 64px;
  z-index: 500;
  padding: 8px 10px;
  border-radius: 5px;
  background: #fff8eaf0;
  color: #745533;
  font-size: 11px;
}
.tile-notice button {
  padding: 2px 7px;
  min-height: 32px;
  font-size: 11px;
  margin-left: 8px;
}
:deep(.leaflet-control-zoom) {
  border: 1px solid #ddd;
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 2px 8px #0001;
}
:deep(.leaflet-control-zoom a) {
  background: #fffef8;
  color: var(--ink);
  width: 36px;
  height: 36px;
  line-height: 36px;
}
:deep(.leaflet-popup-content-wrapper) {
  background: var(--surface);
  border-radius: 10px;
  box-shadow: 0 5px 25px #0003;
}
:deep(.plant-popup) {
  min-width: 170px;
  font-family: var(--sans);
}
:deep(.plant-popup strong) {
  display: block;
  font: 23px var(--display);
  color: var(--ink);
}
:deep(.plant-popup em) {
  display: block;
  font:
    italic 13px Georgia,
    serif;
  margin-top: 8px;
  color: #727867;
}
:deep(.plant-popup p) {
  margin: 10px 0;
  color: var(--muted);
  font-size: 12px;
}
:deep(.plant-popup a) {
  color: var(--primary);
  font-size: 12px;
  display: inline-block;
  padding: 8px 0;
}
:deep(.leaflet-control-attribution) {
  font-size: 9px;
}
@media (max-width: 760px) {
  .plant-map-shell {
    border-radius: 0 0 10px 10px;
  }
  .plant-map {
    height: 440px;
  }
  .map-controls {
    top: 12px;
    left: 12px;
    right: 12px;
  }
  .map-compact {
    border-radius: 8px;
  }
  .map-expanded {
    border-radius: 10px;
  }
}
</style>

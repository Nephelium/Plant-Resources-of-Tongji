<script setup lang="ts">
import L from "leaflet";
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import type { PlantFeature } from "../types";
import { plantColor, plantLink } from "../utils/plants";
import { createMapRenderer } from "../utils/mapRenderer";
import AppIcon from "./AppIcon.vue";
import { useTheme } from "../composables/useTheme";
import { createCampusBasemap } from "../utils/campusMap";
import { readPreference, writePreference } from "../utils/storage";
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
const { resolved } = useTheme();
const dark = ref(resolved.value === "dark");
const scrollZoom = ref(true);
const showPlants = ref(true);
const quietBase = ref(true);
const basemap = ref<"campus" | "online">(
  readPreference("tongjiplants_basemap", "campus") === "online" ? "online" : "campus",
);
const campusError = ref(false);
watch(resolved, (theme) => {
  dark.value = theme === "dark";
});
const tileError = ref(false);
let map: L.Map | undefined;
let layer: L.FeatureGroup | undefined;
let tiles: L.TileLayer | undefined;
let campusMap: ReturnType<typeof createCampusBasemap> | undefined;
let hoverTooltip: L.Tooltip | undefined;
let hoveredMarker: L.CircleMarker | undefined;
const markerFeatures = new WeakMap<L.CircleMarker, PlantFeature>();
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
  if (info.source === "campus-pdf") {
    const source = document.createElement("small");
    source.className = "plant-point-source";
    source.textContent = `PDF 校园调绘图 · ${info.code_id}`;
    box.append(source);
  }
  if (info.chinese_name) box.append(link);
  return box;
}
function markerStyle() {
  const zoom = map?.getZoom() ?? 16;
  const sparse = props.features.length < 600;
  return {
    radius: Math.max(
      sparse ? 3.5 : 1.4,
      Math.min(6, 1.6 + (zoom - 16) * 0.8 + (sparse ? 1 : 0)),
    ),
    color: dark.value ? "#202329" : "#ffffff",
    weight: zoom >= 18 || sparse ? 0.9 : 0,
    fillOpacity: zoom >= 18 || sparse ? 0.95 : 0.8,
  };
}
function clearHover() {
  hoverTooltip?.remove();
  if (hoveredMarker) {
    const style = markerStyle();
    hoveredMarker.setStyle(style).setRadius(style.radius);
    hoveredMarker = undefined;
  }
}
function refreshMarkerStyle() {
  clearHover();
  const style = markerStyle();
  layer?.eachLayer((item) => {
    const marker = item as L.CircleMarker;
    marker.setStyle(style).setRadius(style.radius);
  });
}
function hoverPlant(event: L.LeafletEvent) {
  clearHover();
  const marker = event.layer as L.CircleMarker;
  const feature = markerFeatures.get(marker);
  if (!feature || !map) return;
  hoveredMarker = marker;
  marker.setRadius(markerStyle().radius + 2).setStyle({
    weight: 2,
    color: dark.value ? "#eef5ee" : "#ffffff",
    fillOpacity: 1,
  });
  const label = document.createElement("div");
  const name = document.createElement("strong");
  name.textContent = feature.properties.chinese_name || "待补充名称";
  const family = document.createElement("span");
  family.textContent = feature.properties.category;
  label.append(name, family);
  hoverTooltip ??= L.tooltip({
    direction: "top",
    offset: [0, -10],
    className: "plant-hover-label",
    opacity: 1,
  });
  hoverTooltip.setContent(label).setLatLng(marker.getLatLng()).addTo(map);
}
function renderPoints() {
  if (!map) return;
  clearHover();
  layer?.remove();
  layer = L.featureGroup();
  const style = markerStyle();
  for (const feature of props.features) {
    const [lng, lat] = feature.geometry.coordinates;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const marker = L.circleMarker([lat, lng], {
      ...style,
      fillColor: plantColor(feature.properties.category),
    });
    markerFeatures.set(marker, feature);
    marker.bindPopup(() => popup(feature));
    layer.addLayer(marker);
  }
  layer.on("mouseover", hoverPlant).on("mouseout", clearHover);
  if (showPlants.value) layer.addTo(map);
  resetView();
  refreshMarkerStyle();
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
function switchBasemap() {
  if (!map || !tiles || !campusMap) return;
  if (basemap.value === "campus") {
    tiles.remove();
    campusMap.setTheme(dark.value);
    campusMap.layer.addTo(map);
  } else {
    campusMap.layer.remove();
    tiles.addTo(map);
  }
}
onMounted(() => {
  if (!mapEl.value) return;
  map = L.map(mapEl.value, {
    preferCanvas: true,
    renderer: createMapRenderer(),
    scrollWheelZoom: scrollZoom.value,
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
  });
  tiles.on("tileerror", () => {
    tileError.value = true;
  });
  campusMap = createCampusBasemap(map, dark.value, (failed) => {
    campusError.value = failed;
  });
  switchBasemap();
  map.on("zoomend", refreshMarkerStyle);
  map.on("movestart", clearHover);
  map.on("popupopen", clearHover);
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
watch(dark, (night) => {
  refreshMarkerStyle();
  campusMap?.setTheme(night);
});
watch(basemap, (value) => {
  writePreference("tongjiplants_basemap", value);
  switchBasemap();
});
watch(showPlants, (value) => {
  clearHover();
  if (!map || !layer) return;
  if (value) layer.addTo(map);
  else layer.remove();
});
onBeforeUnmount(() => {
  clearHover();
  clearTimeout(renderTimer);
  observer?.disconnect();
  document.removeEventListener("keydown", onKey);
  if (expanded.value) document.body.style.overflow = previousOverflow;
  // 先移除路径，再销毁 Canvas，防止路径移除时重新排入重绘任务。
  map?.stop();
  campusMap?.dispose();
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
      'map-quiet': quietBase && basemap === 'online',
      'map-campus': basemap === 'campus',
    }"
    :role="expanded ? 'dialog' : undefined"
    :aria-modal="expanded ? true : undefined"
    :aria-label="expanded ? label : undefined"
  >
    <div class="map-controls">
      <div class="map-control-stack">
        <div class="map-base-switch" role="group" aria-label="地图类型">
          <button :aria-pressed="basemap === 'campus'" :class="{ selected: basemap === 'campus' }"
            @click="basemap = 'campus'"><AppIcon name="leaf" :size="15" />校园图</button>
          <button :aria-pressed="basemap === 'online'" :class="{ selected: basemap === 'online' }"
            @click="basemap = 'online'"><AppIcon name="map" :size="15" />在线地图</button>
        </div>
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
    <div v-if="basemap === 'campus' && campusError" class="tile-notice" role="status">
      校园图暂未加载。<button @click="campusMap?.retry(dark)">重新加载</button>
      <button @click="basemap = 'online'">切换在线地图</button>
    </div>
    <div v-if="basemap === 'online' && tileError" class="tile-notice" role="status">
      底图暂未加载，植物点位仍可查看。<button @click="retryTiles">
        重新加载
      </button>
    </div>
    <div class="map-caption">
      <span><i></i> 同济大学 · 四平路校区</span
      >
      <div class="map-options" role="group" aria-label="地图显示">
        <label v-if="basemap === 'online'"><input v-model="quietBase" type="checkbox" />柔和底图</label>
        <label><input v-model="showPlants" type="checkbox" />植物点位</label>
        <label><input v-model="scrollZoom" type="checkbox" />滚轮缩放</label>
      </div>
    </div>
  </div>
</template>
<style scoped>
.plant-map-shell {
  position: relative;
  overflow: hidden;
  border-radius: 0 10px 10px 0;
  background: #f0f2f1;
  min-width: 0;
}
.plant-map {
  height: 550px;
  background: #edf0ef;
  z-index: 0;
}
.map-dark .plant-map {
  background: #24272b;
}
.map-quiet :deep(.leaflet-tile-pane) {
  filter: grayscale(1) contrast(0.72) brightness(1.2);
  opacity: 0.85;
}
.map-dark :deep(.leaflet-tile-pane) {
  filter: grayscale(1) invert(1) contrast(0.85) brightness(0.9);
}
.map-dark.map-quiet :deep(.leaflet-tile-pane) {
  filter: grayscale(1) invert(1) contrast(0.72) brightness(0.85);
  opacity: 0.72;
}
.map-campus :deep(.leaflet-tile-pane) {
  filter: none;
  opacity: 1;
}
.map-campus .plant-map {
  background: #f5f7f4;
}
.map-campus.map-dark .plant-map {
  background: #202328;
}
.map-control-stack {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.map-base-switch {
  display: flex;
  align-items: center;
  pointer-events: auto;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 15px;
  padding: 4px;
  box-shadow: 0 3px 0 var(--card-shadow), 0 5px 18px #0001;
}
.map-base-switch button {
  min-height: 34px;
  border-radius: 10px;
  padding: 6px 12px;
  white-space: nowrap;
}
.map-base-switch button.selected {
  background: var(--leaf-tint);
  color: var(--ink);
  font-weight: 700;
}
:deep(.campus-landmark) {
  display: flex;
  align-items: center;
  justify-content: center;
  font: 600 11px/1.2 var(--sans);
  color: #394e43;
  text-shadow: 0 1px 3px #fff, 0 -1px 3px #fff, 1px 0 3px #fff, -1px 0 3px #fff;
}
:deep(.campus-landmark span) {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
:deep(.campus-landmark small) {
  font-size: 9px;
  font-weight: 500;
  margin-right: 4px;
}
.map-dark :deep(.campus-landmark) {
  color: #d3ddd6;
  text-shadow: 0 1px 3px #202328, 0 -1px 3px #202328, 1px 0 3px #202328, -1px 0 3px #202328;
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
  background: var(--surface);
  border: 0;
  border-radius: 12px;
  min-height: 40px;
  padding: 8px 11px;
  font-size: 11px;
}
.map-theme-switch {
  display: flex;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 15px;
  padding: 4px;
  box-shadow: 0 3px 0 var(--card-shadow), 0 5px 18px #0001;
}
.map-theme-switch button {
  min-height: 34px;
  padding: 6px 12px;
  border-radius: 10px;
}
.map-theme-switch button.selected {
  background: var(--primary);
  color: var(--on-primary);
}
.map-actions {
  display: flex;
  gap: 8px;
}
.map-actions button {
  width: 44px;
  height: 44px;
  border: 1px solid var(--line);
  box-shadow: 0 3px 0 var(--card-shadow), 0 5px 18px #0001;
}
.map-controls button:active {
  translate: 0 2px;
}
.map-caption {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  min-height: 44px;
  flex-wrap: wrap;
  border-top: 1px solid var(--line);
  background: var(--surface);
  color: var(--muted);
  gap: 10px;
  font-size: 11px;
}
.map-options {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px;
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
  background: var(--primary);
}
.map-caption label {
  display: flex;
  align-items: center;
  gap: 5px;
  min-height: 24px;
  cursor: pointer;
}
.map-caption input {
  min-height: 0;
  width: 14px;
  height: 14px;
  margin: 0;
  accent-color: var(--primary);
}
.map-expanded {
  position: fixed;
  inset: 12px;
  display: flex;
  flex-direction: column;
  z-index: 2000;
  border: 1px solid var(--line);
  border-radius: 20px;
  box-shadow: 0 0 0 40px #15171ce6;
}
.map-expanded .plant-map {
  flex: 1;
  height: auto;
  min-height: 0;
}
.map-compact {
  border-radius: 10px;
}
.map-compact .plant-map {
  height: 320px;
}
.map-compact.map-expanded .plant-map {
  height: auto;
}
.map-expanded .map-caption {
  flex: 0 0 auto;
}
.tile-notice {
  position: absolute;
  left: 14px;
  bottom: 70px;
  right: 64px;
  z-index: 500;
  padding: 8px 10px;
  border-radius: 5px;
  background: var(--error-bg);
  color: var(--error-ink);
  font-size: 11px;
}
.tile-notice button {
  padding: 2px 7px;
  min-height: 32px;
  font-size: 11px;
  margin-left: 8px;
}
:deep(.leaflet-control-zoom) {
  border: 1px solid var(--line);
  border-radius: 13px;
  overflow: hidden;
  box-shadow: 0 3px 0 var(--card-shadow), 0 5px 18px #0001;
}
:deep(.leaflet-control-zoom a) {
  background: var(--surface);
  color: var(--ink);
  width: 42px;
  height: 42px;
  line-height: 42px;
  font-weight: 400;
}
:deep(.leaflet-control-zoom a:first-child) {
  border-bottom-color: var(--line);
}
:deep(.leaflet-control-scale-line) {
  background: var(--surface);
  color: var(--muted);
  border-color: var(--muted);
  border-radius: 0 0 4px 4px;
  text-shadow: none;
  font: 10px var(--sans);
}
:deep(.leaflet-bottom .leaflet-control) {
  margin-bottom: 12px;
}
:deep(.leaflet-right .leaflet-control) {
  margin-right: 16px;
}
:deep(.leaflet-left .leaflet-control) {
  margin-left: 16px;
}
:deep(.plant-hover-label) {
  background: var(--surface);
  color: var(--ink);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 8px 13px;
  box-shadow: 0 4px 18px var(--overlay-shadow);
  font-family: var(--sans);
}
:deep(.plant-hover-label::before) {
  border-top-color: var(--surface);
}
:deep(.plant-hover-label strong) {
  font-size: 13px;
  margin-right: 10px;
}
:deep(.plant-hover-label span) {
  font-size: 10px;
  color: var(--muted);
}
:deep(.leaflet-popup-content-wrapper) {
  background: var(--surface);
  border-radius: 18px;
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
  color: var(--muted);
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
:deep(.plant-point-source) {
  display: block;
  color: var(--muted);
  font-size: 10px;
  margin-bottom: 4px;
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
  .map-control-stack {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  .map-compact {
    border-radius: 8px;
  }
  .map-expanded {
    border-radius: 16px;
    inset: 8px;
  }
  .map-caption {
    gap: 8px;
    padding: 10px 12px;
  }
  .map-options {
    gap: 12px;
    width: 100%;
    justify-content: space-between;
  }
}
@media (max-width: 420px) {
  .map-actions {
    flex-direction: column;
  }
}

:deep(.leaflet-popup-tip) {
  background: var(--surface);
}
:deep(.leaflet-popup-close-button) {
  color: var(--muted);
}
:deep(.leaflet-control-attribution) {
  background: var(--surface);
  color: var(--muted);
  margin: 0 !important;
  border-radius: 8px 0 0 0;
  padding: 1px 6px;
}
:deep(.leaflet-control-attribution a) {
  color: var(--primary);
}
:deep(.leaflet-control-zoom a:hover) {
  background: var(--soft);
}
:deep(.leaflet-control-zoom a.leaflet-disabled) {
  color: var(--muted);
  background: var(--soft);
}
</style>

<script setup lang="ts">
import L from "leaflet";
import { computed, onMounted, ref, watch } from "vue";
import { api } from "../api";
import type { PlantFeature } from "../types";

const mapEl = ref<HTMLElement | null>(null);
const keyword = ref("");
const allFeatures = ref<PlantFeature[]>([]);
const mapRef = ref<L.Map | null>(null);
const markerLayer = ref<L.Layer | null>(null);
const activeBaseLayer = ref("浅色地图");

const filtered = computed(() => {
  const text = keyword.value.trim().toLowerCase();
  if (!text) {
    return allFeatures.value;
  }
  return allFeatures.value.filter((item) => {
    return (
      item.properties.chinese_name.toLowerCase().includes(text) ||
      item.properties.scientific_name.toLowerCase().includes(text)
    );
  });
});

const renderLayer = () => {
  if (!mapRef.value) {
    return;
  }
  if (markerLayer.value) {
    markerLayer.value.remove();
  }
  const layer = L.layerGroup();
  for (const feature of filtered.value) {
    const [lng, lat] = feature.geometry.coordinates;
    const marker = L.circleMarker([lat, lng], {
      radius: 4,
      color: feature.properties.color || "orange",
      weight: 1,
      fillOpacity: 0.8,
    });
    marker.bindPopup(
      `<h3>${feature.properties.chinese_name} ${feature.properties.scientific_name}</h3>
       <div>${feature.properties.category} / ${feature.properties.family}</div>
       <div>花期：${feature.properties.flower_period} 果期：${feature.properties.fruit_period}</div>
       <div><a href="/plant/${encodeURIComponent(feature.properties.chinese_name)}">查看植物详情</a></div>`
    );
    layer.addLayer(marker);
  }
  markerLayer.value = layer;
  mapRef.value.addLayer(layer);
  if (filtered.value.length) {
    const group = L.featureGroup(layer.getLayers());
    mapRef.value.fitBounds(group.getBounds(), { padding: [24, 24] });
  }
};

onMounted(async () => {
  const [data] = await Promise.all([api.getMapPoints()]);
  allFeatures.value = data.features;
  if (!mapEl.value) {
    return;
  }
  const map = L.map(mapEl.value, {
    center: [31.284975584, 121.497655876],
    zoom: 16,
  });
  mapRef.value = map;

  const baseLayers: Record<string, L.TileLayer> = {
    标准地图: L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 22,
      attribution: "© OpenStreetMap",
    }),
    浅色地图: L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      subdomains: "abcd",
      maxZoom: 22,
      attribution: "© OpenStreetMap © CARTO",
    }),
    黑夜模式: L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      subdomains: "abcd",
      maxZoom: 22,
      attribution: "© OpenStreetMap © CARTO",
    }),
  };

  baseLayers[activeBaseLayer.value].addTo(map);
  L.control.layers(baseLayers, {}, { position: "topright" }).addTo(map);
  map.on("baselayerchange", (event) => {
    activeBaseLayer.value = event.name;
  });
  renderLayer();
});

watch(filtered, () => {
  renderLayer();
});
</script>

<template>
  <section>
    <div class="section-panel map-toolbar">
      <input v-model="keyword" placeholder="输入中文名或学名筛选地图点位" />
      <div>当前底图：{{ activeBaseLayer }} ｜ 点位：{{ filtered.length }}</div>
    </div>
    <div ref="mapEl" class="section-panel map-container"></div>
  </section>
</template>

<style scoped>
.map-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 18px;
  margin-bottom: 16px;
  color: #25574f;
  font-weight: 600;
}

.map-toolbar input {
  width: 440px;
  max-width: 100%;
  height: 40px;
  padding: 0 12px;
}

.map-container {
  height: 600px;
  overflow: hidden;
}

:deep(.leaflet-control-layers),
:deep(.leaflet-control-zoom) {
  border: 1px solid rgba(255, 255, 255, 0.55);
  box-shadow: 0 10px 24px rgba(29, 77, 67, 0.25);
  backdrop-filter: blur(8px);
}

:deep(.leaflet-popup-content-wrapper) {
  border-radius: 12px;
  box-shadow: 0 12px 24px rgba(30, 70, 63, 0.28);
}

@media (max-width: 720px) {
  .map-toolbar {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    padding: 10px 12px;
  }

  .map-toolbar input {
    width: 100%;
    height: 36px;
  }

  .map-toolbar div {
    font-size: 12px;
    font-weight: 600;
    line-height: 1.35;
  }

  .map-container {
    height: 62vh;
    min-height: 320px;
  }
}
</style>

<script setup lang="ts">
import L from "leaflet";
import { nextTick, ref } from "vue";
import { api } from "../api";
import type { PlantInfo } from "../types";

const keyword = ref("");
const loading = ref(false);
const results = ref<PlantInfo[]>([]);
const selectedPlant = ref<PlantInfo | null>(null);
const mapEl = ref<HTMLElement | null>(null);
const detailMap = ref<L.Map | null>(null);
const pointLayer = ref<L.Layer | null>(null);

const search = async () => {
  loading.value = true;
  try {
    results.value = await api.getPlants(keyword.value);
    selectedPlant.value = null;
  } finally {
    loading.value = false;
  }
};

const renderPlantMap = async () => {
  await nextTick();
  if (!mapEl.value || !selectedPlant.value?.points?.length) {
    return;
  }
  if (!detailMap.value) {
    detailMap.value = L.map(mapEl.value, {
      center: [31.284975584, 121.497655876],
      zoom: 17,
    });
    const tile = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 22,
      attribution: "© OpenStreetMap",
    });
    detailMap.value.addLayer(tile);
  }
  if (pointLayer.value) {
    pointLayer.value.remove();
  }
  const layer = L.layerGroup();
  for (const item of selectedPlant.value.points) {
    const [lng, lat] = item.geometry.coordinates;
    const marker = L.circleMarker([lat, lng], {
      radius: 5,
      color: item.properties.color || "#e49f5f",
      weight: 1,
      fillOpacity: 0.9,
    });
    layer.addLayer(marker);
  }
  pointLayer.value = layer;
  detailMap.value.addLayer(layer);
  const group = L.featureGroup(layer.getLayers());
  detailMap.value.fitBounds(group.getBounds(), { padding: [20, 20] });
};

const showPlantMap = async (name: string) => {
  selectedPlant.value = await api.getPlant(name);
  await renderPlantMap();
};
</script>

<template>
  <section class="section-panel search-panel">
    <div class="search-box">
      <input v-model="keyword" placeholder="学名、中文名、首字母" @keyup.enter="search" />
      <button @click="search">搜索</button>
    </div>
    <div v-if="loading">正在查询...</div>
    <div v-for="item in results" :key="item.chinese_name" class="result-item">
      <span class="plant-name">{{ item.scientific_name }}&nbsp;&nbsp;&nbsp;&nbsp;{{ item.chinese_name }}</span>
      <div class="result-actions">
        <button class="mini-btn" @click="showPlantMap(item.chinese_name)">查看点位</button>
        <RouterLink :to="`/plant/${encodeURIComponent(item.chinese_name)}`" class="detail-link">详情页</RouterLink>
      </div>
    </div>

    <section v-if="selectedPlant?.points?.length" class="search-map-wrap">
      <h3>该植物分布点位</h3>
      <div ref="mapEl" class="search-map"></div>
    </section>
  </section>
</template>

<style scoped>
.search-panel {
  padding: 22px 22px 14px;
  min-height: 0;
}

.search-box {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin: 20px 0;
}

input {
  width: 700px;
  max-width: 100%;
  height: 40px;
  padding: 0 10px;
}

button {
  width: 80px;
  min-width: 80px;
  white-space: nowrap;
  background-color: #76c3b3;
  color: #fff;
  cursor: pointer;
}

.result-item {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  text-align: center;
  margin: 10px 0;
  color: #255e54;
  padding: 10px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.66);
  border: 1px solid rgba(132, 183, 168, 0.34);
}

.mini-btn {
  width: 86px;
  height: 30px;
  font-size: 13px;
}

.result-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.plant-name {
  flex: 1;
}

.detail-link {
  color: #2d746a;
  font-weight: 700;
}

.search-map-wrap {
  margin-top: 24px;
  padding: 14px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.54);
}

.search-map {
  margin-top: 8px;
  height: 320px;
  border: 1px solid rgba(132, 183, 168, 0.35);
  border-radius: 14px;
  overflow: hidden;
}

@media (max-width: 720px) {
  .search-panel {
    padding: 14px 12px 10px;
  }

  .search-box {
    gap: 8px;
    margin: 12px 0;
  }

  input {
    width: calc(100% - 84px);
    height: 36px;
  }

  button {
    width: 72px;
    min-width: 72px;
    font-size: 14px;
  }

  .result-item {
    flex-wrap: wrap;
    justify-content: flex-start;
    text-align: left;
    gap: 6px;
  }

  .plant-name {
    flex-basis: 100%;
  }

  .result-actions {
    width: 100%;
    flex-wrap: wrap;
    gap: 8px;
  }
}
</style>

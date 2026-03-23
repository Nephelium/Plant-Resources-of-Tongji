<script setup lang="ts">
import L from "leaflet";
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { api } from "../api";
import type { PlantInfo, TaxonNode } from "../types";

const tree = ref<TaxonNode[]>([]);
const current = ref<PlantInfo | null>(null);
const imageUrl = ref("");
const mapEl = ref<HTMLElement | null>(null);
const detailPanelEl = ref<HTMLElement | null>(null);
const detailMap = ref<L.Map | null>(null);
const pointLayer = ref<L.Layer | null>(null);
const viewLevel = ref<"family" | "genus" | "species">("species");
const expandedFamilies = ref<Set<string>>(new Set());
const expandedGenera = ref<Set<string>>(new Set());
const TONGJI_BOUNDS: L.LatLngBoundsExpression = [
  [31.2806, 121.4912],
  [31.2892, 121.5038],
];

const treeView = computed(() =>
  tree.value
    .map((family) => ({
      ...family,
      genera: family.genera
        .map((genus) => ({
          ...genus,
          species: genus.species.filter((name) => name && name.trim().length > 0),
        }))
        .filter((genus) => genus.species.length > 0),
    }))
    .filter((family) => family.genera.length > 0)
);

const hasPlantPoints = computed(() => Boolean(current.value?.points?.length));

const genusKey = (familyName: string, genusName: string) => `${familyName}::${genusName}`;

const isFamilyOpen = (familyName: string) => expandedFamilies.value.has(familyName);

const isGenusOpen = (familyName: string, genusName: string) => expandedGenera.value.has(genusKey(familyName, genusName));

const toggleFamily = (familyName: string) => {
  const next = new Set(expandedFamilies.value);
  if (next.has(familyName)) {
    next.delete(familyName);
  } else {
    next.add(familyName);
  }
  expandedFamilies.value = next;
};

const toggleGenus = (familyName: string, genusName: string) => {
  const key = genusKey(familyName, genusName);
  const next = new Set(expandedGenera.value);
  if (next.has(key)) {
    next.delete(key);
  } else {
    next.add(key);
  }
  expandedGenera.value = next;
};

const resetExpandedState = () => {
  if (viewLevel.value === "species") {
    expandedFamilies.value = new Set(tree.value.map((item) => item.familyName));
    expandedGenera.value = new Set(
      tree.value.flatMap((family) => family.genera.map((genus) => genusKey(family.familyName, genus.genusName)))
    );
    return;
  }
  if (viewLevel.value === "genus") {
    expandedFamilies.value = new Set(tree.value.map((item) => item.familyName));
    expandedGenera.value = new Set();
    return;
  }
  expandedFamilies.value = new Set();
  expandedGenera.value = new Set();
};

const renderPlantMap = async () => {
  if (!hasPlantPoints.value) {
    return;
  }
  await nextTick();
  if (!mapEl.value || !current.value?.points?.length) {
    return;
  }
  if (!detailMap.value) {
    detailMap.value = L.map(mapEl.value, {
      center: [31.284975584, 121.497655876],
      zoom: 17,
    });
    const tile = L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      subdomains: "abcd",
      maxZoom: 22,
      attribution: "© OpenStreetMap © CARTO",
    });
    detailMap.value.addLayer(tile);
  }
  if (pointLayer.value) {
    pointLayer.value.remove();
  }
  const layer = L.layerGroup();
  for (const item of current.value.points) {
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
  detailMap.value.fitBounds(TONGJI_BOUNDS, { padding: [20, 20] });
};

const loadPlant = async (name: string) => {
  current.value = await api.getPlant(name);
  imageUrl.value = current.value.imageUrl || current.value.imageCandidates?.[0] || "";
  await renderPlantMap();
  if (window.innerWidth <= 980 && detailPanelEl.value) {
    detailPanelEl.value.scrollIntoView({ behavior: "smooth", block: "start" });
  }
};

onMounted(async () => {
  if (window.innerWidth <= 640) {
    viewLevel.value = "family";
  }
  tree.value = await api.getTaxonTree();
  resetExpandedState();
});

watch(viewLevel, resetExpandedState);
</script>

<template>
  <section class="taxon-layout">
    <aside class="section-panel tree-panel">
      <div class="tree-toolbar">
        <span>显示层级</span>
        <select v-model="viewLevel">
          <option value="family">科</option>
          <option value="genus">属</option>
          <option value="species">种</option>
        </select>
      </div>
      <div v-for="family in treeView" :key="family.familyName" class="family-block">
        <button class="family-summary" @click="toggleFamily(family.familyName)">
          {{ isFamilyOpen(family.familyName) ? "▼" : "▶" }} {{ family.familyName }}
        </button>
        <div v-if="isFamilyOpen(family.familyName)">
          <div v-for="genus in family.genera" :key="genus.genusName" class="genus-block">
            <button class="genus-summary" @click="toggleGenus(family.familyName, genus.genusName)">
              {{ isGenusOpen(family.familyName, genus.genusName) ? "▼" : "▶" }}
              {{ genus.genusName }}
            </button>
            <template v-if="isGenusOpen(family.familyName, genus.genusName)">
              <button v-for="species in genus.species" :key="species" class="species-btn" @click="loadPlant(species)">
                {{ species }}
              </button>
            </template>
          </div>
        </div>
      </div>
    </aside>

    <article ref="detailPanelEl" class="section-panel detail-panel">
      <template v-if="current">
        <h2>{{ current.scientific_name }} {{ current.chinese_name }}</h2>
        <p>{{ current.category }} / {{ current.family }}</p>
        <section v-if="hasPlantPoints" class="plant-map-wrap">
          <h3>该植物分布点位</h3>
          <div ref="mapEl" class="plant-map"></div>
        </section>
        <h3 class="photo-title">植物照片</h3>
        <img v-if="imageUrl" :src="imageUrl" :alt="current.chinese_name" class="plant-image" />
      </template>
      <template v-else>
        <h2>同济大学校园植物网——素不莳花</h2>
        <p>请在左侧分类树中选择植物查看详情。</p>
      </template>
    </article>
  </section>
</template>

<style scoped>
.taxon-layout {
  display: grid;
  grid-template-columns: 27% 1fr;
  gap: 12px;
  min-height: 620px;
  height: 72vh;
  align-items: stretch;
}

.tree-panel {
  padding: 12px;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
}

.detail-panel {
  padding: 22px;
  height: 100%;
  overflow-y: auto;
}

.family-block,
.genus-block {
  margin-bottom: 6px;
}

.family-summary {
  cursor: pointer;
  font-size: 18px;
  font-weight: 800;
  line-height: 1.2;
  color: #1f5a50;
  display: flex;
  align-items: center;
  width: 100%;
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid rgba(132, 183, 168, 0.22);
  background: linear-gradient(120deg, rgba(255, 255, 255, 0.78), rgba(240, 252, 248, 0.8));
  box-shadow: 0 4px 12px rgba(41, 107, 95, 0.08);
}

.family-summary:hover {
  background: linear-gradient(120deg, rgba(225, 246, 239, 0.9), rgba(245, 255, 251, 0.92));
}

.genus-summary {
  cursor: pointer;
  font-size: 15px;
  font-weight: 700;
  padding: 7px 16px;
  color: #2a6d61;
  display: inline-block;
  margin-left: 18px;
  border-radius: 10px;
  border: 1px solid rgba(132, 183, 168, 0.35);
  background: linear-gradient(120deg, rgba(255, 255, 255, 0.9), rgba(233, 248, 243, 0.92));
  box-shadow: 0 4px 12px rgba(41, 107, 95, 0.12);
}

.genus-summary:hover {
  background: linear-gradient(120deg, rgba(216, 241, 234, 0.88), rgba(248, 255, 252, 0.9));
}

.species-btn {
  width: calc(100% - 62px);
  margin-left: 42px;
  display: block;
  text-align: left;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(132, 183, 168, 0.22);
  border-radius: 12px;
  padding: 9px 20px;
  font-size: 14px;
  cursor: pointer;
  color: #2d6e62;
  margin-top: 6px;
}

.tree-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.tree-toolbar select {
  height: 32px;
  min-width: 160px;
}

.species-btn:hover {
  background: linear-gradient(120deg, rgba(216, 241, 234, 0.85), rgba(248, 255, 252, 0.88));
}

.plant-image {
  margin-top: 14px;
  width: 75%;
  max-width: 800px;
  border-radius: 14px;
  box-shadow: 0 12px 26px rgba(35, 88, 77, 0.22);
}

.plant-map-wrap {
  margin-bottom: 16px;
}

.photo-title {
  margin: 10px 0 6px;
  font-size: 15px;
  color: #275e54;
}

.plant-map {
  margin-top: 8px;
  height: 320px;
  width: 75%;
  max-width: 800px;
  border: 1px solid rgba(132, 183, 168, 0.35);
  border-radius: 14px;
  overflow: hidden;
}

@media (max-width: 980px) {
  .taxon-layout {
    grid-template-columns: 1fr;
    height: auto;
    min-height: 0;
  }

  .tree-panel,
  .detail-panel {
    height: auto;
    max-height: none;
    overflow: visible;
  }

  .detail-panel {
    order: 1;
  }

  .tree-panel {
    order: 2;
  }

  .plant-image,
  .plant-map {
    width: 100%;
    max-width: 100%;
  }
}

@media (max-width: 640px) {
  .tree-panel {
    max-height: 46vh;
    overflow-y: auto;
    overflow-x: hidden;
  }

  .tree-toolbar {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }

  .tree-toolbar select {
    width: 100%;
    min-width: 0;
  }

  .genus-summary {
    margin-left: 10px;
    font-size: 14px;
    padding: 6px 12px;
  }

  .species-btn {
    width: calc(100% - 36px);
    margin-left: 24px;
    padding: 8px 14px;
    font-size: 13px;
  }

  .family-summary {
    padding: 8px 10px;
    font-size: 16px;
  }

  .detail-panel {
    padding: 14px;
  }

  .plant-map {
    height: 260px;
  }
}
</style>

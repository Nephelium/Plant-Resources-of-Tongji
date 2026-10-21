<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { api } from "../api";
import BotanicalHero from "../components/BotanicalHero.vue";
import type { PlantFeature } from "../types";
import AppIcon from "../components/AppIcon.vue";
import PlantMap from "../components/PlantMap.vue";
import PlantGallery from "../components/PlantGallery.vue";
import {
  campusDayKey,
  pickPlants,
  type DiscoveryPlant,
} from "../utils/discovery";
import { plantColor, plantImage, plantLink } from "../utils/plants";
const route = useRoute();
const router = useRouter();
const keyword = ref(String(route.query.q || ""));
const family = ref(String(route.query.family || ""));
const features = ref<PlantFeature[]>([]);
const loading = ref(true);
const error = ref("");
const showAll = ref(false);
const today = ref(campusDayKey());
const photoSpecies = computed<DiscoveryPlant[]>(() => {
  const pool = new Map<string, DiscoveryPlant>();
  for (const feature of features.value) {
    const p = feature.properties;
    if (p.chinese_name.trim() && plantImage(p.chinese_name))
      pool.set(p.chinese_name, {
        name: p.chinese_name,
        latin: p.scientific_name,
        family: p.category,
      });
  }
  return [...pool.values()].sort((a, b) =>
    a.name.localeCompare(b.name, "zh-CN"),
  );
});
const dailySpecimens = computed(() =>
  pickPlants(photoSpecies.value, 3, "campus-" + today.value),
);
const discoveries = ref<DiscoveryPlant[]>([]);
function refreshDiscoveries() {
  const exclude = new Set(
    [...dailySpecimens.value, ...discoveries.value].map((p) => p.name),
  );
  const available = photoSpecies.value.filter((p) => !exclude.has(p.name));
  discoveries.value = pickPlants(
    available.length >= 4 ? available : photoSpecies.value,
    4,
    String(Math.random()),
  );
}
watch([photoSpecies, today], refreshDiscoveries);
let dayTimer: ReturnType<typeof setInterval> | undefined;
const updateDay = () => {
  today.value = campusDayKey();
};
const families = computed(() =>
  [
    ...new Set(
      features.value.map((f) => f.properties.category).filter(Boolean),
    ),
  ].sort((a, b) => a.localeCompare(b, "zh-CN")),
);
const speciesCount = computed(
  () =>
    new Set(
      features.value.map((f) => f.properties.chinese_name).filter(Boolean),
    ).size,
);
const filtered = computed(() => {
  const q = keyword.value.trim().toLowerCase();
  return features.value.filter(
    (f) =>
      (!family.value || f.properties.category === family.value) &&
      (!q ||
        [
          f.properties.chinese_name,
          f.properties.scientific_name,
          f.properties.category,
          f.properties.family,
        ].some((v) => v.toLowerCase().includes(q))),
  );
});
const species = computed(() => {
  const items = new Map<
    string,
    { name: string; latin: string; family: string; count: number }
  >();
  filtered.value.forEach((f) => {
    const p = f.properties,
      existing = items.get(p.chinese_name);
    if (!p.chinese_name.trim()) return;
    if (existing) existing.count++;
    else
      items.set(p.chinese_name, {
        name: p.chinese_name,
        latin: p.scientific_name,
        family: p.category,
        count: 1,
      });
  });
  return [...items.values()].sort((a, b) => b.count - a.count);
});
const visibleSpecies = computed(() =>
  species.value.slice(0, showAll.value ? undefined : 8),
);
const selected = computed(() => keyword.value || family.value);
async function load() {
  loading.value = true;
  error.value = "";
  try {
    features.value = (await api.getMapPoints()).features;
  } catch {
    error.value = "植物点位暂时没有加载成功，请重试。";
  } finally {
    loading.value = false;
  }
}
function clear() {
  keyword.value = "";
  family.value = "";
  showAll.value = false;
}
function explore() {
  document.getElementById("explore")?.scrollIntoView({ block: "start" });
}
watch([keyword, family], () => {
  showAll.value = false;
  void router.replace({
    query: {
      ...(keyword.value ? { q: keyword.value } : {}),
      ...(family.value ? { family: family.value } : {}),
    },
  });
});
watch(
  () => route.query,
  (query) => {
    keyword.value = String(query.q || "");
    family.value = String(query.family || "");
  },
);
onMounted(() => {
  void load();
  dayTimer = setInterval(updateDay, 60_000);
  document.addEventListener("visibilitychange", updateDay);
});
onBeforeUnmount(() => {
  clearInterval(dayTimer);
  document.removeEventListener("visibilitychange", updateDay);
});
</script>
<template>
  <section>
    <BotanicalHero :specimens="dailySpecimens" @explore="explore" />
    <div class="stats-strip" v-reveal aria-label="植物资源概览">
      <div>
        <strong>{{ loading ? "—" : speciesCount }}</strong
        ><span>种植物</span>
      </div>
      <div>
        <strong>{{ loading ? "—" : families.length }}</strong
        ><span>个科</span>
      </div>
      <div>
        <strong>{{ loading ? "—" : features.length.toLocaleString() }}</strong
        ><span>个调查点位</span>
      </div>
      <p>抬头看看，<br />惊喜就在身边。</p>
      <RouterLink to="/search" class="text-link"
        >翻开植物图鉴 <AppIcon name="arrow" :size="16"
      /></RouterLink>
    </div>
    <div id="explore" class="section-heading" v-reveal>
      <div>
        <div class="eyebrow">01 / EXPLORE THE CAMPUS</div>
        <h2>沿着地图，走近草木</h2>
      </div>
      <span class="map-heading-tip">点击点位，认识身边的植物</span>
    </div>
    <div v-if="error" class="error-state" role="alert">
      {{ error }} <button @click="load">重新加载</button>
    </div>
    <div
      v-else-if="loading"
      class="skeleton map-skeleton"
      role="status"
      aria-label="正在加载校园植物地图"
    ></div>
    <div v-else class="map-workspace section-panel">
      <aside class="map-sidebar">
        <div class="sidebar-title">
          <AppIcon name="leaf" :size="19" />
          <h3>寻找一株植物</h3>
        </div>
        <label class="search-field"
          ><AppIcon name="search" :size="17" /><input
            v-model="keyword"
            aria-label="搜索地图植物"
            placeholder="中文名、学名或科属" /><button
            v-if="keyword"
            class="icon-button"
            aria-label="清空地图搜索"
            @click="keyword = ''"
          >
            <AppIcon name="close" :size="15" /></button
        ></label>
        <label class="family-select"
          ><span>按科浏览</span
          ><select v-model="family" aria-label="地图科筛选">
            <option value="">全部科</option>
            <option v-for="name in families" :key="name">{{ name }}</option>
          </select></label
        >
        <div v-if="dailySpecimens.length" class="daily-plants">
          <span>今日遇见</span>
          <div class="quick-plants">
            <button
              v-for="plant in dailySpecimens"
              :key="plant.name"
              class="chip"
              :aria-pressed="keyword === plant.name"
              @click="keyword = keyword === plant.name ? '' : plant.name"
            >
              {{ plant.name }}
            </button>
          </div>
        </div>
        <div class="map-result-count" role="status">
          <span
            >{{ species.length }} 种 ·
            {{ filtered.length.toLocaleString() }} 个点位</span
          ><button v-if="selected" @click="clear">重置</button>
        </div>
        <div v-if="!filtered.length" class="empty-state small-empty">
          <AppIcon name="search" :size="30" />
          <h3>还没找到这株植物</h3>
          <p>试试更短的名称，或清除科筛选。</p>
          <button @click="clear">查看全部植物</button>
        </div>
        <div v-else class="map-species-list">
          <div
            v-for="item in visibleSpecies"
            :key="item.name"
            class="map-species-row"
          >
            <button
              class="species-filter"
              :aria-label="'筛选' + item.name"
              @click="keyword = item.name"
            >
              <i :style="{ background: plantColor(item.family) }"></i
              ><span
                ><strong>{{ item.name }}</strong
                ><em>{{ item.latin }}</em></span
              ><small>{{ item.count }}</small>
            </button>
            <RouterLink
              :to="plantLink(item.name)"
              class="species-detail"
              :aria-label="'查看' + item.name + '档案'"
              ><AppIcon name="arrow" :size="16"
            /></RouterLink>
          </div>
          <button
            v-if="species.length > 8 && !showAll"
            class="show-species"
            @click="showAll = true"
          >
            展开全部 {{ species.length }} 种
            <AppIcon name="chevron" :size="13" />
          </button>
        </div>
        <div class="sidebar-note">
          点位来自校园植物调查记录。<br />按科着色，放大地图可查看单株。
        </div>
      </aside>
      <PlantMap :features="filtered" />
    </div>
    <div class="section-heading" v-reveal>
      <div>
        <div class="eyebrow">02 / A CLOSER LOOK</div>
        <h2>熟悉的校园，新的相识</h2>
      </div>
      <div class="discovery-actions">
        <button class="text-link" @click="refreshDiscoveries">
          <AppIcon name="reset" :size="15" />换一组</button
        ><RouterLink to="/search" class="text-link"
          >浏览全部 <AppIcon name="arrow" :size="16"
        /></RouterLink>
      </div>
    </div>
    <div class="discovery-grid">
      <article
        v-for="(plant, i) in discoveries"
        :key="plant.name"
        class="discovery-card"
        v-reveal="i * 65"
      >
        <div class="discovery-image">
          <PlantGallery :name="plant.name" compact /><span>0{{ i + 1 }}</span>
        </div>
        <RouterLink :to="plantLink(plant.name)" class="discovery-title"
          ><h3>{{ plant.name }}</h3>
          <AppIcon name="arrow" :size="18"
        /></RouterLink>
        <p>
          {{ plant.family
          }}<span class="discovery-latin">{{ plant.latin }}</span>
        </p>
      </article>
    </div>
    <RouterLink to="/articles" class="journal-banner" v-reveal
      ><div>
        <div class="eyebrow">FIELD NOTES / 校园自然手记</div>
        <h2>把路过的风景，读成故事。</h2>
        <p>植物地标、调绘日常与草木的名字，都在这里。</p>
      </div>
      <span>翻开手记 <AppIcon name="arrow" /></span
    ></RouterLink>
  </section>
</template>
<style scoped>
.stats-strip {
  display: flex;
  align-items: center;
  gap: 36px;
  padding: 25px 6px;
  border-bottom: 1px solid var(--line);
}
.stats-strip > div {
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding-right: 36px;
  border-right: 1px solid var(--line);
}
.stats-strip strong {
  font:
    31px Georgia,
    serif;
  color: var(--primary);
}
.stats-strip span {
  color: var(--muted);
  font-size: 11px;
  white-space: nowrap;
}
.stats-strip p {
  margin: 0;
  color: #6c7a8b;
  font-family: var(--display);
  font-size: 13px;
}
.stats-strip > a {
  margin-left: auto;
  white-space: nowrap;
}
.map-heading-tip {
  font-size: 11px;
  color: var(--muted);
}
.map-workspace {
  display: grid;
  grid-template-columns: 290px minmax(0, 1fr);
  overflow: hidden;
}
.map-sidebar {
  padding: 22px 18px 14px;
  height: 590px;
  display: flex;
  flex-direction: column;
}
.sidebar-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 18px;
}
.sidebar-title h3 {
  font-family: var(--display);
  font-weight: 600;
  font-size: 19px;
  margin: 0;
}
.map-sidebar input {
  font-size: 12px;
}
.family-select {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 11px;
  color: var(--muted);
  font-size: 11px;
}
.family-select select {
  flex: 1;
  min-height: 36px;
  padding: 6px 9px;
  font-size: 11px;
}
.quick-plants {
  display: flex;
  gap: 6px;
  margin: 12px 0;
}
.map-result-count {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 10px;
  color: var(--muted);
  border-bottom: 1px solid var(--line);
  min-height: 36px;
}
.map-result-count button {
  border: 0;
  padding: 0;
  min-height: 24px;
  font-size: 10px;
  background: transparent;
  color: var(--primary);
}
.map-species-list {
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}
.map-species-row {
  display: flex;
  align-items: center;
  border-bottom: 1px solid #e9ece3;
}
.species-filter {
  display: flex;
  align-items: center;
  padding: 11px 0;
  border: 0;
  background: transparent;
  width: 100%;
  min-width: 0;
  text-align: left;
}
.species-filter:hover {
  background: #eaf3ec;
}
.species-filter > i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-right: 3px;
}
.species-filter > span {
  min-width: 0;
  flex: 1;
}
.species-filter strong {
  display: block;
  font-weight: 500;
  font-size: 12px;
}
.species-filter em {
  display: block;
  font:
    italic 10px Georgia,
    serif;
  color: var(--muted);
  margin-top: 3px;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}
.species-filter small {
  font-size: 10px;
  color: var(--muted);
  padding: 0 4px;
}
.species-detail {
  padding: 10px 7px;
}
.show-species {
  border: 0;
  width: 100%;
  font-size: 11px;
  background: transparent;
}
.sidebar-note {
  color: #768397;
  font-size: 10px;
  padding-top: 13px;
  line-height: 1.7;
}
.small-empty {
  padding: 22px 5px;
}
.map-skeleton {
  height: 590px;
}
.discovery-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 23px;
}
.discovery-card {
  min-width: 0;
}
.discovery-image {
  position: relative;
  aspect-ratio: 4 / 3;
  height: auto;
  overflow: hidden;
  border-radius: 8px;
  background: var(--soft);
}
.discovery-image :deep(.plant-image) {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 15%;
  transition: transform 0.5s;
  filter: saturate(1.06);
}
.discovery-card:hover :deep(.gallery-slide .plant-image) {
  transform: scale(1.04);
}
.discovery-image > span {
  position: absolute;
  top: 12px;
  left: 14px;
  pointer-events: none;
  color: white;
  font:
    italic 14px Georgia,
    serif;
  text-shadow: 0 1px 4px #0007;
}
.discovery-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 15px 0 5px;
}
.discovery-title h3 {
  font: 20px var(--display);
  margin: 0;
}
.discovery-card p {
  color: var(--muted);
  font-size: 11px;
}
.journal-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  background: #dcebdd;
  padding: 35px 38px;
  border: 1px solid #dae1cf;
  border-radius: 10px;
  margin-top: 38px;
}
.journal-banner h2 {
  font-size: 25px;
  margin: 12px 0 10px;
}
.journal-banner p {
  color: var(--muted);
  margin: 0;
  font-size: 12px;
}
.journal-banner > span {
  display: flex;
  align-items: center;
  gap: 24px;
  white-space: nowrap;
  font-size: 12px;
}
@media (max-width: 1100px) {
  .stats-strip {
    gap: 24px;
  }
  .stats-strip > div {
    padding-right: 24px;
  }
  .stats-strip p {
    display: none;
  }
  .map-workspace {
    grid-template-columns: 260px minmax(0, 1fr);
  }
  .discovery-image {
    height: 180px;
  }
}
@media (max-width: 760px) {
  .stats-strip {
    gap: 18px;
    padding: 22px 0;
  }
  .stats-strip > div {
    gap: 7px;
    padding-right: 18px;
  }
  .stats-strip > a {
    display: none;
  }
  .stats-strip > div:last-of-type {
    border: 0;
    padding: 0;
  }
  .map-workspace {
    grid-template-columns: 1fr;
  }
  .map-sidebar {
    height: auto;
    padding: 20px;
  }
  .map-species-list {
    max-height: 200px;
  }
  .sidebar-note {
    display: none;
  }
  .discovery-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 20px;
  }
}
@media (max-width: 480px) {
  .stats-strip {
    justify-content: space-between;
    gap: 8px;
  }
  .stats-strip strong {
    font-size: 26px;
  }
  .stats-strip > div {
    flex-direction: column;
    gap: 5px;
    padding-right: 20px;
  }
  .stats-strip span {
    font-size: 10px;
  }
  .map-heading-tip {
    display: none;
  }
  .discovery-image {
    height: 175px;
  }
  .journal-banner {
    display: block;
    padding: 25px;
  }
  .journal-banner h2 {
    font-size: 23px;
  }
  .journal-banner > span {
    margin-top: 20px;
  }
}

.discovery-card {
  background: var(--surface);
  border: 1px solid #afc2b4;
  border-radius: 20px 23px 19px 24px;
  overflow: hidden;
  box-shadow: 0 5px 0 #dde6de;
  transition:
    translate 0.25s,
    rotate 0.25s,
    box-shadow 0.25s;
}
.discovery-card:hover {
  translate: 0 -7px;
  rotate: -1deg;
  box-shadow: 0 10px 0 #d1dfd4;
}
.discovery-card:nth-child(even):hover {
  rotate: 1deg;
}
.discovery-image {
  border-radius: 0;
}
.discovery-title {
  padding: 0 17px;
  margin-top: 18px;
}
.discovery-title h3 {
  font-weight: 700;
}
.discovery-title svg {
  color: var(--primary);
  transition: translate 0.2s;
}
.discovery-card:hover .discovery-title svg {
  translate: 4px 0;
}
.discovery-card > p {
  padding: 0 17px 10px;
}
.discovery-image > span {
  background: var(--leaf-tint);
  color: #2e5740;
  width: 31px;
  height: 31px;
  border-radius: 11px;
  display: grid;
  place-items: center;
  font-family: var(--display);
  font-weight: 700;
  text-shadow: none;
  box-shadow: 0 3px 0 #adc8b5;
  transform: rotate(-7deg);
}
.discovery-card:nth-child(even) .discovery-image > span {
  background: var(--petal);
  color: #765166;
  box-shadow: 0 3px 0 #cfa5b6;
}
.journal-banner {
  background: #dcebdd;
  border: 1.5px solid #96b29e;
  border-radius: 26px 32px 24px 30px;
  box-shadow: 0 6px 0 #c4d8c8;
  position: relative;
  transition:
    translate 0.25s,
    box-shadow 0.25s;
}
.journal-banner:hover {
  translate: 0 -4px;
  box-shadow: 0 10px 0 #c4d8c8;
}
.journal-banner .eyebrow {
  color: var(--primary);
}
.journal-banner h2 {
  font-weight: 800;
}
.journal-banner > span {
  padding: 13px 22px;
  background: var(--leaf-tint);
  border: 1px solid #8caf97;
  color: #284d38;
  border-radius: 15px;
  box-shadow: 0 4px 0 #c2d9c9;
  gap: 15px;
}
.stats-strip {
  background: #e1eddf;
  border: 1px solid #bfd2c0;
  border-radius: 25px 31px 24px 29px;
  padding: 24px 30px;
  margin: 5px 0 48px;
  box-shadow: 0 4px 0 #d4e3d5;
}
.stats-strip strong {
  font-family: var(--display);
  font-weight: 800;
}
.stats-strip > div:nth-child(2) strong {
  color: #44895e;
}
.stats-strip > div:nth-child(3) strong {
  color: #b85e7e;
}
.stats-strip > div {
  border-color: #becfbe;
}
.section-heading {
  margin-top: 42px;
}
.map-workspace {
  border-radius: 22px;
  border-color: #9fb7a8;
  box-shadow: 0 6px 0 #dce5de;
}
@media (max-width: 760px) {
  .stats-strip {
    padding: 20px;
    gap: 14px;
    margin-bottom: 30px;
  }
  .stats-strip > div {
    padding-right: 18px;
  }
}
@media (max-width: 480px) {
  .stats-strip {
    padding: 19px;
    gap: 9px;
  }
  .stats-strip > div {
    padding-right: 16px;
  }
  .discovery-title {
    padding: 0 12px;
  }
  .discovery-card > p {
    padding: 0 12px 10px;
  }
  .discovery-title h3 {
    font-size: 18px;
  }
}

.daily-plants {
  margin: 18px 0 15px;
}
.daily-plants > span {
  display: block;
  margin-bottom: 8px;
  color: var(--muted);
  font-size: 10px;
  letter-spacing: 0.1em;
}
.daily-plants .quick-plants {
  margin: 0;
  gap: 7px;
}
.discovery-actions {
  display: flex;
  gap: 22px;
  align-items: center;
}
.discovery-actions > button {
  border: 0;
  background: transparent;
  padding: 5px 0;
  font-size: 12px;
}
.discovery-latin {
  display: block;
  font:
    italic 12px/1.5 Georgia,
    serif;
  margin-top: 5px;
  overflow-wrap: anywhere;
}
.discovery-card > p {
  min-height: 42px;
  padding-bottom: 20px;
}
.discovery-image .plant-gallery {
  height: 100%;
}
@media (max-width: 600px) {
  .discovery-actions {
    gap: 14px;
  }
  .discovery-actions > a {
    font-size: 11px;
  }
  .discovery-image {
    aspect-ratio: 1;
    height: auto;
  }
  .discovery-card > p {
    min-height: 55px;
  }
  .discovery-latin {
    font-size: 10px;
  }
}
</style>

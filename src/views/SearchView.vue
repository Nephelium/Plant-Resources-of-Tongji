<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { api } from "../api";
import type { PlantInfo } from "../types";
import AppIcon from "../components/AppIcon.vue";
import PageHeading from "../components/PageHeading.vue";
import PlantImage from "../components/PlantImage.vue";
import { plantLink } from "../utils/plants";
import { readPreference, writePreference } from "../utils/storage";
const route = useRoute(),
  router = useRouter();
const keyword = ref(String(route.query.q || ""));
const family = ref(String(route.query.family || ""));
const plants = ref<PlantInfo[]>([]);
const loading = ref(true),
  error = ref("");
const layout = ref(
  readPreference("tongjiplants_catalog_layout", "grid") === "list"
    ? "list"
    : "grid",
);
const page = ref(Math.max(1, Number(route.query.page) || 1));
const pageSize = 24;
const resultsStart = ref<HTMLElement>();
const families = computed(() =>
  [...new Set(plants.value.map((p) => p.category))].sort((a, b) =>
    a.localeCompare(b, "zh-CN"),
  ),
);
const results = computed(() => {
  const terms = keyword.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return plants.value.filter(
    (p) =>
      (!family.value || p.category === family.value) &&
      terms.every((term) =>
        [p.chinese_name, p.scientific_name, p.category, p.family].some((text) =>
          text.toLowerCase().includes(term),
        ),
      ),
  );
});
const totalPages = computed(() =>
  Math.max(1, Math.ceil(results.value.length / pageSize)),
);
const visible = computed(() =>
  results.value.slice((page.value - 1) * pageSize, page.value * pageSize),
);
const pageNumbers = computed(() =>
  Array.from({ length: totalPages.value }, (_, i) => i + 1),
);
function syncQuery() {
  void router.replace({
    query: {
      ...(keyword.value ? { q: keyword.value } : {}),
      ...(family.value ? { family: family.value } : {}),
      ...(page.value > 1 ? { page: String(page.value) } : {}),
    },
  });
}
watch([keyword, family], () => {
  page.value = 1;
  syncQuery();
});
watch(page, syncQuery);
watch(
  () => route.query,
  (query) => {
    keyword.value = String(query.q || "");
    family.value = String(query.family || "");
    page.value = Math.min(
      totalPages.value,
      Math.max(1, Number(query.page) || 1),
    );
  },
);
watch(layout, (value) => writePreference("tongjiplants_catalog_layout", value));
async function load() {
  loading.value = true;
  error.value = "";
  try {
    plants.value = await api.getPlants();
    page.value = Math.min(page.value, totalPages.value);
  } catch {
    error.value = "植物图鉴暂时没有加载成功，请稍后重试。";
  } finally {
    loading.value = false;
  }
}
function clear() {
  keyword.value = "";
  family.value = "";
}
function changePage(value: number) {
  page.value = value;
  resultsStart.value?.scrollIntoView({ block: "start" });
}
onMounted(load);
</script>
<template>
  <section class="catalog-page">
    <PageHeading
      eyebrow="THE CAMPUS HERBARIUM / 校园植物图鉴"
      title="发现身边的植物"
      description="用名字寻找，或从一片叶、一朵花开始认识。"
      ><RouterLink to="/taxon" class="text-link"
        >沿着分类树探索 <AppIcon name="arrow" :size="16" /></RouterLink
    ></PageHeading>
    <div class="catalog-tools section-panel">
      <label class="search-field catalog-search"
        ><AppIcon name="search" /><input
          v-model="keyword"
          type="search"
          aria-label="检索植物"
          placeholder="搜索中文名、学名或科属"
      /></label>
      <div class="catalog-filter-row">
        <div class="popular">
          <span>试着找找</span
          ><button
            v-for="name in ['银杏', '玉兰', '樱花', '蔷薇科']"
            :key="name"
            class="chip"
            :aria-pressed="keyword === name"
            @click="keyword = keyword === name ? '' : name"
          >
            {{ name }}
          </button>
        </div>
        <label class="catalog-family"
          ><span>按科筛选</span
          ><select v-model="family" aria-label="按科筛选">
            <option value="">全部科</option>
            <option v-for="name in families" :key="name">{{ name }}</option>
          </select></label
        >
      </div>
    </div>
    <div ref="resultsStart" class="catalog-summary">
      <p role="status">
        {{ loading ? "正在翻开植物图鉴…" : "找到 " + results.length + " 种植物"
        }}<button v-if="keyword || family" class="clear-filter" @click="clear">
          清除筛选 <AppIcon name="close" :size="13" />
        </button>
      </p>
      <div class="view-switch" role="group" aria-label="图鉴显示方式">
        <button
          :aria-pressed="layout === 'grid'"
          :class="{ selected: layout === 'grid' }"
          aria-label="卡片视图"
          @click="layout = 'grid'"
        >
          <AppIcon name="grid" :size="17" /></button
        ><button
          :aria-pressed="layout === 'list'"
          :class="{ selected: layout === 'list' }"
          aria-label="列表视图"
          @click="layout = 'list'"
        >
          <AppIcon name="list" :size="18" />
        </button>
      </div>
    </div>
    <div v-if="error" class="error-state" role="alert">
      {{ error }} <button @click="load">重新加载</button>
    </div>
    <div v-else-if="loading" class="catalog-grid">
      <div v-for="i in 8" :key="i" class="skeleton"></div>
    </div>
    <div v-else-if="!results.length" class="empty-state section-panel">
      <AppIcon name="search" :size="44" />
      <h2>还没有找到匹配的植物</h2>
      <p>试试更短的名称，或清除科筛选后再找找。</p>
      <button class="button-primary" @click="clear">浏览全部植物</button>
    </div>
    <div
      v-else
      class="catalog-grid"
      :class="{ 'catalog-list': layout === 'list' }"
    >
      <article
        v-for="plant in visible"
        :key="plant.chinese_name"
        class="plant-card"
        v-reveal
      >
        <RouterLink
          :to="plantLink(plant.chinese_name)"
          class="plant-card-image"
          :aria-label="'查看' + plant.chinese_name"
          ><PlantImage
            :name="plant.chinese_name"
            :src="plant.imageUrl"
          /><span>{{ plant.category }}</span></RouterLink
        >
        <div class="plant-card-copy">
          <RouterLink
            :to="plantLink(plant.chinese_name)"
            class="plant-card-name"
            ><h2>{{ plant.chinese_name }}</h2>
            <AppIcon name="arrow" :size="16"
          /></RouterLink>
          <p class="plant-latin">{{ plant.scientific_name }}</p>
          <div class="plant-card-meta">
            <span>{{ plant.family }}</span
            ><RouterLink :to="{ path: '/', query: { q: plant.chinese_name } }"
              ><AppIcon name="pin" :size="12" />查看分布</RouterLink
            >
          </div>
        </div>
      </article>
    </div>
    <nav
      v-if="!loading && !error && totalPages > 1"
      class="pagination"
      aria-label="图鉴分页"
    >
      <button
        :disabled="page === 1"
        aria-label="上一页"
        @click="changePage(page - 1)"
      >
        <AppIcon name="back" :size="16" /></button
      ><button
        v-for="n in pageNumbers"
        :key="n"
        :aria-current="page === n ? 'page' : undefined"
        :class="{ selected: page === n }"
        :aria-label="'第' + n + '页'"
        @click="changePage(n)"
      >
        {{ n }}</button
      ><button
        :disabled="page === totalPages"
        aria-label="下一页"
        @click="changePage(page + 1)"
      >
        <AppIcon name="arrow" :size="16" />
      </button>
    </nav>
  </section>
</template>
<style scoped>
.catalog-tools {
  padding: 18px 20px;
  border-radius: 22px;
  background: #fff;
}
.catalog-page :deep(.page-heading) {
  margin-bottom: 26px;
}
.catalog-search {
  max-width: 100%;
}
.catalog-search input {
  min-height: 54px;
  font-size: 14px;
}
.catalog-filter-row {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-top: 18px;
  align-items: center;
}
.popular {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.popular > span {
  font-size: 11px;
  color: var(--muted);
  margin-right: 8px;
}
.catalog-family {
  display: flex;
  gap: 12px;
  align-items: center;
  color: var(--muted);
  font-size: 11px;
}
.catalog-family select {
  min-height: 36px;
  padding: 6px 10px;
  min-width: 145px;
  font-size: 12px;
}
.catalog-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 26px 0 20px;
  scroll-margin-top: 110px;
}
.catalog-summary p {
  margin: 0;
  color: var(--muted);
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 18px;
}
.clear-filter {
  padding: 4px 8px;
  min-height: 32px;
  font-size: 10px;
  background: transparent;
  border: 0;
}
.view-switch {
  display: flex;
  gap: 3px;
}
.view-switch button {
  min-height: 36px;
  padding: 8px;
  background: transparent;
  border-color: transparent;
}
.view-switch button.selected {
  background: #e4eee6;
  border-color: #a4c2ae;
}
.catalog-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 24px;
}
.plant-card {
  background: var(--surface);
  border: 1px solid #afc2b4;
  box-shadow: 0 4px 0 #e0e8de;
  border-radius: 21px;
  overflow: hidden;
  min-width: 0;
  transition:
    translate 0.25s,
    box-shadow 0.25s,
    border-color 0.2s;
}
.plant-card:hover {
  border-color: #a9b99b;
  box-shadow: 0 9px 0 #d6e3d8;
  translate: 0 -5px;
}
.plant-card-image {
  display: block;
  height: 212px;
  position: relative;
  overflow: hidden;
  background: var(--soft);
}
.plant-card-image :deep(img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 15%;
  transition: transform 0.5s;
}
.plant-card:hover :deep(img) {
  transform: scale(1.035);
}
.plant-card-image > span {
  position: absolute;
  left: 12px;
  bottom: 12px;
  color: #24573b;
  background: #fffffff2;
  border-radius: 9px;
  font-size: 10px;
  padding: 3px 7px;
}
.plant-card-copy {
  padding: 19px 18px 14px;
}
.plant-card-name {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.plant-card-name h2 {
  font-size: 21px;
  margin: 0;
}
.plant-latin {
  color: var(--muted);
  font:
    italic 12px/1.5 Georgia,
    serif;
  margin: 9px 0 19px;
  min-height: 18px;
  overflow-wrap: anywhere;
}
.plant-card-meta {
  display: flex;
  justify-content: space-between;
  gap: 6px;
  padding-top: 12px;
  border-top: 1px solid var(--line);
  color: var(--muted);
  font-size: 10px;
}
.plant-card-meta a {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--primary);
}
.catalog-list {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}
.catalog-list .plant-card {
  display: grid;
  grid-template-columns: 125px minmax(0, 1fr);
}
.catalog-list .plant-card-image {
  height: 100%;
  min-height: 150px;
}
.pagination {
  display: flex;
  gap: 7px;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 32px;
}
.pagination button {
  padding: 8px;
  width: 40px;
  min-height: 40px;
}
.pagination .selected {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}
@media (max-width: 1050px) {
  .catalog-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 20px;
  }
  .catalog-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 760px) {
  .catalog-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
  }
  .catalog-tools {
    padding: 16px;
  }
  .catalog-filter-row {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-top: 12px;
  }
  .catalog-family {
    margin-top: 0;
    margin-left: auto;
    gap: 6px;
  }
  .catalog-family > span {
    display: none;
  }
  .catalog-family select {
    min-width: 100px;
    width: 100px;
    max-width: 100%;
    font-size: 12px;
  }
  .catalog-family select {
    flex: 1;
  }
  .catalog-search input {
    font-size: 12px;
  }
  .catalog-list {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 480px) {
  .plant-card-image {
    height: 175px;
  }
  .plant-card-copy {
    padding: 14px 12px;
  }
  .plant-card-name h2 {
    font-size: 18px;
  }
  .plant-latin {
    font-size: 11px;
    min-height: 33px;
    margin: 8px 0 12px;
  }
  .plant-card-meta {
    flex-wrap: wrap;
  }
  .popular > span {
    display: none;
  }
  .catalog-page :deep(.page-heading) {
    margin-bottom: 20px;
    gap: 12px;
  }
  .catalog-page :deep(.page-heading h1) {
    font-size: 30px;
    line-height: 1.3;
  }
  .catalog-page :deep(.page-heading p) {
    margin-top: 12px;
    font-size: 12px;
  }
  .catalog-page :deep(.page-heading .eyebrow) {
    font-size: 9px;
    letter-spacing: 0.13em;
  }
  .catalog-tools {
    padding: 12px;
    border-radius: 18px;
  }
  .catalog-search input {
    min-height: 44px;
  }
  .popular {
    flex-wrap: nowrap;
  }
  .popular .chip {
    font-size: 11px;
    min-height: 32px;
    padding: 5px 8px;
  }
  .catalog-family select {
    min-height: 32px;
    width: 94px;
    min-width: 94px;
    padding: 4px 5px;
  }
  .catalog-summary {
    margin: 18px 0 14px;
  }
  .plant-card {
    border-radius: 17px;
  }
  .plant-card-image > span {
    left: 9px;
    bottom: 9px;
  }
  .plant-card-meta {
    font-size: 10px;
  }
  .popular {
    gap: 6px;
  }
  .catalog-summary p {
    gap: 5px;
  }
}
</style>

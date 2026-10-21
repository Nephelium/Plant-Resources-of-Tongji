<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { api } from "../api";
import type { PlantInfo, TaxonNode } from "../types";
import AppIcon from "../components/AppIcon.vue";
import PageHeading from "../components/PageHeading.vue";
import PlantProfile from "../components/PlantProfile.vue";
const route = useRoute(),
  router = useRouter();
const tree = ref<TaxonNode[]>([]),
  current = ref<PlantInfo | null>(null);
const loading = ref(true),
  plantLoading = ref(false),
  error = ref(""),
  plantError = ref("");
const keyword = ref(""),
  level = ref("family");
const openFamilies = ref(new Set<string>()),
  openGenera = ref(new Set<string>());
const detailPanel = ref<HTMLElement>();
let requestId = 0;
const key = (family: string, genus: string) => family + "::" + genus;
const filtered = computed(() => {
  const q = keyword.value.trim().toLowerCase();
  return tree.value
    .map((f) => ({
      ...f,
      genera: f.genera
        .map((g) => ({
          ...g,
          species: g.species.filter(
            (s) =>
              s.trim() &&
              (!q ||
                f.familyName.toLowerCase().includes(q) ||
                g.genusName.toLowerCase().includes(q) ||
                s.toLowerCase().includes(q)),
          ),
        }))
        .filter((g) => g.species.length),
    }))
    .filter((f) => f.genera.length);
});
const speciesCount = computed(() =>
  tree.value.reduce(
    (n, f) => n + f.genera.reduce((a, g) => a + g.species.length, 0),
    0,
  ),
);
function toggle(set: Set<string>, value: string) {
  if (set.has(value)) set.delete(value);
  else set.add(value);
}
function resetOpen() {
  openFamilies.value = new Set(
    level.value === "family" ? [] : tree.value.map((f) => f.familyName),
  );
  openGenera.value = new Set(
    level.value === "species"
      ? tree.value.flatMap((f) =>
          f.genera.map((g) => key(f.familyName, g.genusName)),
        )
      : [],
  );
}
async function loadPlant(name: string, scroll = false) {
  const id = ++requestId;
  plantLoading.value = true;
  plantError.value = "";
  current.value = null;
  try {
    const value = await api.getPlant(name);
    if (id === requestId) current.value = value;
  } catch {
    if (id === requestId) plantError.value = "这份植物档案暂时没有加载成功。";
  } finally {
    if (id === requestId) {
      plantLoading.value = false;
      if (scroll && window.innerWidth <= 850)
        detailPanel.value?.scrollIntoView({ block: "start" });
    }
  }
}
function choose(name: string) {
  void router.push({ query: { plant: name } });
}
async function loadTree() {
  loading.value = true;
  error.value = "";
  try {
    tree.value = await api.getTaxonTree();
    resetOpen();
  } catch {
    error.value = "分类目录暂时没有加载成功。";
  } finally {
    loading.value = false;
  }
}
watch(level, resetOpen);
watch(
  () => route.query.plant,
  (name) => {
    if (name) void loadPlant(String(name), true);
    else {
      requestId++;
      current.value = null;
      plantError.value = "";
      plantLoading.value = false;
    }
  },
);
onMounted(async () => {
  await loadTree();
  if (route.query.plant) await loadPlant(String(route.query.plant));
});
onBeforeUnmount(() => {
  requestId++;
});
</script>
<template>
  <section>
    <PageHeading
      eyebrow="A FAMILY OF PLANTS / 草木谱系"
      title="循着科属，认识草木"
      description="从科到属，再到每一种植物。沿着分类的枝条，发现它们的联系。"
      ><span class="badge"
        >{{ tree.length }} 科 · {{ speciesCount }} 种</span
      ></PageHeading
    >
    <div class="taxon-layout">
      <aside class="section-panel tree-panel">
        <label class="search-field"
          ><AppIcon name="search" :size="17" /><input
            v-model="keyword"
            aria-label="筛选分类目录"
            placeholder="查找科、属或植物" /><button
            v-if="keyword"
            aria-label="清空分类筛选"
            class="icon-button"
            @click="keyword = ''"
          >
            <AppIcon name="close" :size="14" /></button></label
        ><label class="tree-toolbar"
          >展开到<select v-model="level">
            <option value="family">科</option>
            <option value="genus">属</option>
            <option value="species">种</option>
          </select></label
        >
        <div v-if="loading" class="empty-state" role="status">
          正在展开分类目录…
        </div>
        <div v-else-if="error" class="error-state" role="alert">
          {{ error }}<button @click="loadTree">重新加载</button>
        </div>
        <p v-else-if="!filtered.length" class="empty-state">
          没有匹配的分类或植物，试试其他名称。
        </p>
        <div v-else class="taxonomy-tree">
          <div v-for="f in filtered" :key="f.familyName" class="family-block">
            <button
              class="family-summary"
              :aria-expanded="
                Boolean(keyword) || openFamilies.has(f.familyName)
              "
              @click="toggle(openFamilies, f.familyName)"
            >
              <AppIcon
                name="chevron"
                :size="13"
                :class="{ rotated: keyword || openFamilies.has(f.familyName) }"
              /><strong>{{ f.familyName }}</strong
              ><span>{{
                f.genera.reduce((n, g) => n + g.species.length, 0)
              }}</span>
            </button>
            <div
              v-if="keyword || openFamilies.has(f.familyName)"
              class="genera"
            >
              <div v-for="g in f.genera" :key="g.genusName">
                <button
                  class="genus-summary"
                  :aria-expanded="
                    Boolean(keyword) ||
                    openGenera.has(key(f.familyName, g.genusName))
                  "
                  @click="toggle(openGenera, key(f.familyName, g.genusName))"
                >
                  <AppIcon
                    name="chevron"
                    :size="11"
                    :class="{
                      rotated:
                        keyword ||
                        openGenera.has(key(f.familyName, g.genusName)),
                    }"
                  />{{ g.genusName }}
                </button>
                <div
                  v-if="
                    keyword || openGenera.has(key(f.familyName, g.genusName))
                  "
                  class="species"
                >
                  <button
                    v-for="name in g.species"
                    :key="name"
                    :class="{ selected: route.query.plant === name }"
                    :aria-pressed="route.query.plant === name"
                    @click="choose(name)"
                  >
                    {{ name
                    }}<AppIcon
                      v-if="route.query.plant === name"
                      name="leaf"
                      :size="13"
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>
      <article ref="detailPanel" class="section-panel taxon-detail">
        <div
          v-if="plantLoading"
          class="skeleton"
          role="status"
          aria-label="正在加载所选植物"
        ></div>
        <div v-else-if="plantError" class="error-state" role="alert">
          {{ plantError
          }}<button @click="loadPlant(String(route.query.plant))">
            重新加载
          </button>
        </div>
        <PlantProfile v-else-if="current" :plant="current" compact />
        <div v-else class="taxon-welcome">
          <div class="welcome-leaf"><AppIcon name="leaf" :size="64" /></div>
          <div class="eyebrow">EVERY LEAF HAS A NAME</div>
          <h2>给熟悉的绿意，<br />一个准确的名字。</h2>
          <p>在分类目录中选择一株植物，<br />查看它的科属、照片与校园分布。</p>
          <div class="taxonomy-example">
            <span>科</span><AppIcon name="arrow" :size="15" /><span>属</span
            ><AppIcon name="arrow" :size="15" /><span>种</span>
          </div>
          <button class="button-primary" @click="choose('银杏')">
            从银杏开始 <AppIcon name="arrow" :size="16" />
          </button>
        </div>
      </article>
    </div>
  </section>
</template>
<style scoped>
.taxon-layout {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 24px;
  align-items: start;
}
.tree-panel {
  position: sticky;
  top: 110px;
  padding: 18px;
  max-height: calc(100dvh - 140px);
  display: flex;
  flex-direction: column;
}
.tree-panel input {
  font-size: 12px;
}
.tree-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 14px 0;
  font-size: 11px;
  color: var(--muted);
}
.tree-toolbar select {
  min-height: 34px;
  padding: 5px 10px;
  width: 110px;
  font-size: 12px;
}
.taxonomy-tree {
  overflow: auto;
  min-height: 0;
}
.family-block {
  border-bottom: 1px solid #e7eadf;
}
.family-summary {
  display: flex;
  width: 100%;
  padding: 13px 5px;
  border: 0;
  background: transparent;
  text-align: left;
  border-radius: 4px;
  gap: 9px;
}
.family-summary strong {
  font-size: 13px;
  font-weight: 500;
  flex: 1;
}
.family-summary > span {
  font:
    11px Georgia,
    serif;
  color: var(--muted);
}
.rotated {
  transform: rotate(90deg);
}
.genera {
  padding-left: 15px;
  border-left: 1px solid var(--line);
  margin: 0 0 10px 11px;
}
.genus-summary {
  border: 0;
  background: transparent;
  padding: 8px 0;
  min-height: 36px;
  font-size: 11px;
  gap: 7px;
}
.species {
  padding: 0 0 6px 18px;
}
.species button {
  display: flex;
  width: 100%;
  text-align: left;
  justify-content: space-between;
  padding: 8px 10px;
  min-height: 36px;
  border: 0;
  background: transparent;
  font-size: 12px;
}
.species button.selected {
  background: var(--soft);
  color: var(--primary);
  font-weight: 700;
}
.family-summary:hover,
.genus-summary:hover,
.species button:hover {
  background: #eaf3ec;
}
.taxon-detail {
  padding: 32px;
  min-height: 610px;
  scroll-margin-top: 100px;
}
.taxon-welcome {
  min-height: 545px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  background: radial-gradient(ellipse at center, #e1eee4cc, transparent 70%);
}
.welcome-leaf {
  width: 115px;
  height: 115px;
  border: 1px solid #b0cbb7;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #438363;
  margin-bottom: 26px;
}
.taxon-welcome h2 {
  font-size: 33px;
  margin: 18px 0;
  line-height: 1.55;
}
.taxon-welcome p {
  color: var(--muted);
  font-size: 13px;
}
.taxonomy-example {
  display: flex;
  gap: 22px;
  align-items: center;
  margin: 15px 0 25px;
  color: #598568;
}
.taxonomy-example span {
  width: 38px;
  height: 38px;
  border: 1px solid var(--line);
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-family: var(--display);
}
.taxon-welcome button {
  font-size: 12px;
}
.skeleton {
  height: 500px;
}
@media (max-width: 1100px) {
  .taxon-layout {
    grid-template-columns: 250px minmax(0, 1fr);
    gap: 18px;
  }
  .taxon-detail {
    padding: 24px;
  }
}
@media (max-width: 850px) {
  .taxon-layout {
    grid-template-columns: 1fr;
  }
  .tree-panel {
    position: static;
    max-height: 410px;
  }
  .taxon-detail {
    padding: 22px;
    min-height: 0;
  }
  .taxon-welcome {
    min-height: 460px;
  }
}
</style>

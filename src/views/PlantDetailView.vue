<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { api } from "../api";
import type { PlantInfo } from "../types";

const route = useRoute();
const router = useRouter();
const loading = ref(false);
const detail = ref<PlantInfo | null>(null);
const imageUrl = ref("");

const plantName = computed(() => String(route.params.name ?? ""));

const loadDetail = async () => {
  if (!plantName.value) {
    return;
  }
  loading.value = true;
  try {
    const data = await api.getPlant(plantName.value);
    detail.value = data;
    imageUrl.value = data.imageUrl || data.imageCandidates?.[0] || "";
  } finally {
    loading.value = false;
  }
};

onMounted(loadDetail);
watch(plantName, loadDetail);
</script>

<template>
  <section class="section-panel detail-page">
    <div v-if="loading">加载中...</div>
    <template v-else-if="detail">
      <div class="actions">
        <button @click="router.back()">返回上一页</button>
        <RouterLink to="/taxon">返回分类系统</RouterLink>
      </div>
      <h2>{{ detail.scientific_name }}&nbsp;&nbsp;{{ detail.chinese_name }}</h2>
      <div class="meta-grid">
        <div class="meta-item"><span>科属：</span>{{ detail.category }} / {{ detail.family }}</div>
        <div class="meta-item"><span>花期：</span>{{ detail.flower_period }}</div>
        <div class="meta-item"><span>果期：</span>{{ detail.fruit_period }}</div>
        <div class="meta-item"><span>点位：</span>{{ detail.points?.length ?? 0 }} 个</div>
      </div>
      <p class="desc">{{ detail.description }}</p>
      <img v-if="imageUrl" :src="imageUrl" :alt="detail.chinese_name" class="plant-image" />
      <div v-else class="no-image">暂未找到该植物图片</div>
      <div v-if="detail.related?.length" class="related">
        <div class="related-title">同类植物推荐</div>
        <div class="related-list">
          <RouterLink
            v-for="item in detail.related"
            :key="item.chinese_name"
            :to="`/plant/${encodeURIComponent(item.chinese_name)}`"
          >
            {{ item.chinese_name }}（{{ item.scientific_name }}）
          </RouterLink>
        </div>
      </div>
    </template>
    <template v-else>
      <h2>未找到该植物</h2>
    </template>
  </section>
</template>

<style scoped>
.detail-page {
  padding: 28px;
  min-height: 620px;
}

.actions {
  display: flex;
  gap: 14px;
  align-items: center;
  margin-bottom: 10px;
}

.actions button {
  width: 104px;
  height: 34px;
  border: none;
  color: #fff;
  background: #85cbc0;
  cursor: pointer;
}

.actions a {
  color: #2f7e73;
  font-weight: 700;
}

.meta-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin: 8px 0;
}

.meta-item {
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(132, 183, 168, 0.32);
  border-radius: 10px;
}

.meta-item span {
  font-weight: 700;
}

.desc {
  margin-top: 10px;
  line-height: 1.8;
}

.plant-image {
  margin-top: 16px;
  width: 78%;
  max-width: 860px;
  border-radius: 14px;
  box-shadow: 0 14px 28px rgba(29, 79, 68, 0.22);
}

.no-image {
  margin-top: 12px;
  color: #9d6b6b;
}

.related {
  margin-top: 18px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.58);
  border: 1px solid rgba(132, 183, 168, 0.3);
}

.related-title {
  font-weight: 700;
  margin-bottom: 8px;
}

.related-list {
  display: grid;
  gap: 6px;
}

.related-list a {
  color: #2f7e73;
}
</style>

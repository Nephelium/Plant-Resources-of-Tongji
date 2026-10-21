<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { api } from "../api";
import type { PlantInfo } from "../types";
import AppIcon from "../components/AppIcon.vue";
import PlantProfile from "../components/PlantProfile.vue";
const route = useRoute(),
  router = useRouter();
const detail = ref<PlantInfo | null>(null),
  loading = ref(true),
  error = ref("");
let requestId = 0;
async function load() {
  const id = ++requestId;
  loading.value = true;
  error.value = "";
  detail.value = null;
  try {
    const value = await api.getPlant(String(route.params.name));
    if (id === requestId) detail.value = value;
  } catch {
    if (id === requestId)
      error.value =
        "暂时无法找到这份植物档案。可以重新加载，或回到图鉴继续查找。";
  } finally {
    if (id === requestId) loading.value = false;
  }
}
function goBack() {
  if (router.options.history.state.back) router.back();
  else void router.push("/search");
}
watch(() => route.params.name, load, { immediate: true });
onBeforeUnmount(() => {
  requestId++;
});
</script>
<template>
  <section>
    <nav class="detail-breadcrumb" aria-label="植物档案导航">
      <button class="text-link" @click="goBack">
        <AppIcon name="back" :size="16" />返回</button
      ><span>/</span><RouterLink to="/search">植物图鉴</RouterLink><span>/</span
      ><span>{{ route.params.name }}</span>
    </nav>
    <div
      v-if="loading"
      class="skeleton"
      role="status"
      aria-label="正在加载植物档案"
    ></div>
    <div v-else-if="error" class="empty-state section-panel" role="alert">
      <AppIcon name="leaf" :size="44" />
      <h2>这份档案暂时无法打开</h2>
      <p>{{ error }}</p>
      <button @click="load">重新加载</button
      ><RouterLink to="/search" class="button button-primary"
        >浏览植物图鉴</RouterLink
      >
    </div>
    <PlantProfile v-else-if="detail" :plant="detail" />
  </section>
</template>
<style scoped>
.detail-breadcrumb {
  display: flex;
  gap: 14px;
  align-items: center;
  color: var(--muted);
  font-size: 12px;
  margin-bottom: 28px;
  flex-wrap: wrap;
}
.detail-breadcrumb button {
  border: 0;
  padding: 0 8px 0 0;
  background: transparent;
}
.skeleton {
  height: 550px;
}
.empty-state .button {
  margin-left: 10px;
}
</style>

<script setup lang="ts">
import AppIcon from "../components/AppIcon.vue";
</script>
<template>
  <section class="empty-state section-panel">
    <AppIcon name="leaf" :size="48" />
    <div class="eyebrow">404 · 一条尚未走通的小径</div>
    <h1>这页还没有生长出来</h1>
    <p>可以回到植物地图，或检索想认识的植物。</p>
    <RouterLink to="/" class="button button-primary"
      >回到植物地图 <AppIcon name="arrow"
    /></RouterLink>
  </section>
</template>

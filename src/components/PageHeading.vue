<script setup lang="ts">
defineProps<{ eyebrow: string; title: string; description: string }>();
</script>
<template>
  <header class="page-heading">
    <div>
      <div class="eyebrow">{{ eyebrow }}</div>
      <h1>{{ title }}</h1>
      <p>{{ description }}</p>
    </div>
    <div class="page-heading-actions"><slot /></div>
  </header>
</template>

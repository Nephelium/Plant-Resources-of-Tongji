<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { plantImage } from "../utils/plants";
import AppIcon from "./AppIcon.vue";
const props = withDefaults(
  defineProps<{ name: string; src?: string; eager?: boolean }>(),
  { src: "", eager: false },
);
const failed = ref(false);
const url = computed(() => plantImage(props.name) || props.src);
watch(url, () => {
  failed.value = false;
});
</script>
<template>
  <img
    v-if="url && !failed"
    :src="url"
    :alt="name"
    :loading="eager ? 'eager' : 'lazy'"
    decoding="async"
    @error="failed = true"
  />
  <div
    v-else
    class="image-placeholder"
    role="img"
    :aria-label="`${name}暂无照片`"
  >
    <AppIcon name="leaf" :size="44" /><span>{{ name }} · 照片待补充</span>
  </div>
</template>

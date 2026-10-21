<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { plantImage } from "../utils/plants";
import { plantPhotoSheet } from "../utils/photos";
import AppIcon from "./AppIcon.vue";
const props = withDefaults(
  defineProps<{
    name: string;
    src?: string;
    eager?: boolean;
    photoIndex?: number;
    fit?: "cover" | "contain";
  }>(),
  { src: "", eager: false, photoIndex: 0, fit: "cover" },
);
const frame = ref<HTMLElement>(),
  failed = ref(false),
  visible = ref(props.eager);
const url = computed(() => plantImage(props.name) || props.src);
const sheet = computed(() => plantPhotoSheet(props.name));
const region = computed(() => {
  const value = sheet.value;
  return value?.regions[Math.min(props.photoIndex, value.regions.length - 1)];
});
const label = computed(() =>
  !url.value || failed.value
    ? props.name + "暂无照片"
    : props.name +
      (sheet.value && sheet.value.regions.length > 1
        ? " · 第" + (props.photoIndex + 1) + "张照片"
        : ""),
);
let observer: IntersectionObserver | undefined;
watch(url, () => {
  failed.value = false;
});
watch(
  () => props.eager,
  (value) => {
    if (value) visible.value = true;
  },
);
onMounted(() => {
  if (props.eager || !("IntersectionObserver" in window)) {
    visible.value = true;
    return;
  }
  observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        visible.value = true;
        observer?.disconnect();
      }
    },
    { rootMargin: "200px" },
  );
  if (frame.value) observer.observe(frame.value);
});
onBeforeUnmount(() => observer?.disconnect());
</script>
<template>
  <span
    ref="frame"
    class="plant-image"
    :class="{ 'photo-missing': !url || failed }"
    role="img"
    :aria-label="label"
    :style="region ? { aspectRatio: region[2] + '/' + region[3] } : undefined"
  >
    <template v-if="url && !failed">
      <svg
        v-if="sheet && region && visible"
        :viewBox="region.join(' ')"
        :preserveAspectRatio="
          fit === 'contain' ? 'xMidYMid meet' : 'xMidYMid slice'
        "
        aria-hidden="true"
      >
        <image
          class="photo-source"
          :href="url"
          x="0"
          y="0"
          :width="sheet.width"
          :height="sheet.height"
          @error="failed = true"
        />
      </svg>
      <img
        v-else-if="visible"
        class="photo-source"
        :src="url"
        alt=""
        :style="{ objectFit: fit }"
        decoding="async"
        @error="failed = true"
      />
    </template>
    <span v-else class="image-placeholder"
      ><AppIcon name="leaf" :size="40" /><span
        >{{ name }} · 照片待补充</span
      ></span
    >
  </span>
</template>
<style scoped>
.plant-image {
  display: block;
  position: relative;
  width: 100%;
  height: 100%;
  min-width: 0;
  overflow: hidden;
  background: var(--soft);
}
.plant-image > svg,
.plant-image > img {
  display: block;
  width: 100%;
  height: 100%;
}
.plant-image > img {
  object-fit: cover;
}
.photo-missing {
  min-height: 140px;
}
.image-placeholder {
  width: 100%;
  height: 100%;
}
</style>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  useId,
  watch,
} from "vue";
import PlantImage from "./PlantImage.vue";
import AppIcon from "./AppIcon.vue";
import { plantPhotoCount } from "../utils/photos";
const props = withDefaults(
  defineProps<{
    name: string;
    src?: string;
    compact?: boolean;
    eager?: boolean;
  }>(),
  { src: "", compact: false, eager: false },
);
const count = computed(() => plantPhotoCount(props.name, props.src));
const active = ref(0),
  isOpen = ref(false),
  zoomed = ref(false);
const track = ref<HTMLElement>(),
  dialog = ref<HTMLDialogElement>(),
  lightboxScroll = ref<HTMLElement>();
const labelId = "photo-title-" + useId();
let resizeObserver: ResizeObserver | undefined,
  scrollFrame = 0;
let drag: { x: number; left: number; id: number; moved: boolean } | null = null;
let suppressClickUntil = 0,
  previousOverflow: string | null = null;
let swipeStart: { x: number; y: number } | null = null;
function startSwipe(event: PointerEvent) {
  if (event.pointerType === "touch" && !zoomed.value)
    swipeStart = { x: event.clientX, y: event.clientY };
}
function finishSwipe(event: PointerEvent) {
  if (!swipeStart || zoomed.value) return;
  const dx = event.clientX - swipeStart.x,
    dy = event.clientY - swipeStart.y;
  swipeStart = null;
  if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3)
    changePhoto(dx < 0 ? 1 : -1);
}
const reducedMotion = () =>
  matchMedia("(prefers-reduced-motion: reduce)").matches;
function goTo(index: number, smooth = true) {
  active.value = Math.max(0, Math.min(count.value - 1, index));
  track.value?.scrollTo({
    left: active.value * track.value.clientWidth,
    behavior: smooth && !reducedMotion() ? "smooth" : "instant",
  });
}
function onScroll() {
  cancelAnimationFrame(scrollFrame);
  scrollFrame = requestAnimationFrame(() => {
    if (track.value?.clientWidth)
      active.value = Math.round(
        track.value.scrollLeft / track.value.clientWidth,
      );
  });
}
function trackKey(event: KeyboardEvent) {
  if (event.key === "ArrowRight") goTo(active.value + 1);
  else if (event.key === "ArrowLeft") goTo(active.value - 1);
  else if (event.key === "Home") goTo(0);
  else if (event.key === "End") goTo(count.value - 1);
  else return;
  event.preventDefault();
}
function pointerDown(event: PointerEvent) {
  if (event.pointerType !== "mouse" || event.button !== 0 || !track.value)
    return;
  drag = {
    x: event.clientX,
    left: track.value.scrollLeft,
    id: event.pointerId,
    moved: false,
  };
}
function pointerMove(event: PointerEvent) {
  if (!drag || !track.value) return;
  const distance = event.clientX - drag.x;
  if (Math.abs(distance) > 6) {
    drag.moved = true;
    track.value.setPointerCapture(event.pointerId);
    track.value.classList.add("is-dragging");
  }
  if (drag.moved) {
    event.preventDefault();
    track.value.scrollLeft = drag.left - distance;
  }
}
function pointerUp() {
  if (!drag) return;
  if (drag.moved) {
    suppressClickUntil = Date.now() + 250;
    const nearest = track.value
      ? Math.round(track.value.scrollLeft / track.value.clientWidth)
      : active.value;
    if (track.value?.hasPointerCapture(drag.id))
      track.value.releasePointerCapture(drag.id);
    track.value?.classList.remove("is-dragging");
    goTo(nearest);
  }
  drag = null;
}
function captureClick(event: MouseEvent) {
  if (Date.now() < suppressClickUntil) {
    event.preventDefault();
    event.stopPropagation();
  }
}
async function openPhoto(index: number) {
  if (!count.value) return;
  active.value = index;
  zoomed.value = false;
  isOpen.value = true;
  await nextTick();
  previousOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  dialog.value?.showModal();
}
function restoreScroll() {
  if (previousOverflow !== null) {
    document.body.style.overflow = previousOverflow;
    previousOverflow = null;
  }
}
function closePhoto() {
  dialog.value?.close();
  restoreScroll();
  isOpen.value = false;
  zoomed.value = false;
}
function changePhoto(delta: number) {
  zoomed.value = false;
  goTo((active.value + delta + count.value) % count.value, false);
}
function lightboxKey(event: KeyboardEvent) {
  if (zoomed.value && event.target === lightboxScroll.value) return;
  if (event.key === "ArrowRight") changePhoto(1);
  else if (event.key === "ArrowLeft") changePhoto(-1);
  else return;
  event.preventDefault();
}
async function toggleZoom() {
  zoomed.value = !zoomed.value;
  await nextTick();
  const box = lightboxScroll.value;
  if (box) {
    box.scrollLeft = (box.scrollWidth - box.clientWidth) / 2;
    box.scrollTop = (box.scrollHeight - box.clientHeight) / 2;
  }
}
watch(
  () => props.name,
  async () => {
    closePhoto();
    active.value = 0;
    await nextTick();
    goTo(0, false);
  },
);
onMounted(() => {
  resizeObserver = new ResizeObserver(() => goTo(active.value, false));
  if (track.value) resizeObserver.observe(track.value);
});
onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  cancelAnimationFrame(scrollFrame);
  dialog.value?.close();
  restoreScroll();
});
</script>
<template>
  <div
    class="plant-gallery"
    :class="{ 'gallery-compact': compact }"
    :data-plant="name"
    :data-photo-index="active"
    :data-photo-count="count"
  >
    <div v-if="count" class="gallery-window">
      <div
        ref="track"
        class="gallery-track"
        role="group"
        :aria-label="name + '照片，可左右滑动'"
        tabindex="0"
        @scroll.passive="onScroll"
        @keydown="trackKey"
        @pointerdown="pointerDown"
        @pointermove="pointerMove"
        @pointerup="pointerUp"
        @pointercancel="pointerUp"
        @dragstart.prevent
        @click.capture="captureClick"
      >
        <button
          v-for="(_, i) in count"
          :key="name + i"
          class="gallery-slide"
          :aria-label="'放大查看' + name + '第' + (i + 1) + '张照片'"
          :tabindex="active === i ? 0 : -1"
          @click="openPhoto(i)"
        >
          <PlantImage
            :name="name"
            :src="src"
            :photo-index="i"
            :fit="compact ? 'cover' : 'contain'"
            :eager="eager && i === 0"
          />
        </button>
      </div>
      <span v-if="count > 1" class="gallery-count" aria-live="polite"
        >{{ active + 1 }} / {{ count }}</span
      >
      <span class="gallery-open-hint" aria-hidden="true"
        ><AppIcon name="expand" :size="14" />看大图</span
      >
      <template v-if="count > 1">
        <button
          class="gallery-arrow previous"
          :aria-label="name + '上一张照片'"
          :disabled="active === 0"
          @click="goTo(active - 1)"
        >
          <AppIcon name="back" :size="18" />
        </button>
        <button
          class="gallery-arrow next"
          :aria-label="name + '下一张照片'"
          :disabled="active === count - 1"
          @click="goTo(active + 1)"
        >
          <AppIcon name="arrow" :size="18" />
        </button>
      </template>
    </div>
    <PlantImage v-else :name="name" :src="src" />
    <div v-if="!compact && count" class="gallery-caption">
      <span>{{ name }} · 校园植物影像</span>
      <div
        v-if="count > 1"
        class="gallery-dots"
        role="group"
        :aria-label="name + '照片页码'"
      >
        <button
          v-for="(_, i) in count"
          :key="i"
          :class="{ active: active === i }"
          :aria-label="'查看' + name + '第' + (i + 1) + '张'"
          :aria-pressed="active === i"
          @click="goTo(i)"
        >
          <span></span>
        </button>
      </div>
      <span class="gallery-help">滑动浏览 · 点击放大</span>
    </div>
    <Teleport to="body">
      <dialog
        v-if="isOpen"
        ref="dialog"
        class="photo-lightbox"
        :aria-labelledby="labelId"
        @cancel.prevent="closePhoto"
        @close="restoreScroll"
        @keydown="lightboxKey"
        @click="
          (event) => {
            if (event.target === dialog) closePhoto();
          }
        "
      >
        <div class="lightbox-inner">
          <header class="lightbox-toolbar">
            <div>
              <h2 :id="labelId">{{ name }}</h2>
              <span aria-live="polite">{{ active + 1 }} / {{ count }}</span>
            </div>
            <div>
              <button
                :aria-label="zoomed ? '恢复照片大小' : '放大照片细节'"
                :aria-pressed="zoomed"
                @click="toggleZoom"
              >
                <AppIcon :name="zoomed ? 'reset' : 'search'" :size="18" />{{
                  zoomed ? "还原" : "放大"
                }}
              </button>
              <button
                class="lightbox-close"
                aria-label="关闭照片查看器"
                autofocus
                @click="closePhoto"
              >
                <AppIcon name="close" :size="23" />
              </button>
            </div>
          </header>
          <div
            ref="lightboxScroll"
            class="lightbox-scroll"
            :class="{ zoomed }"
            tabindex="0"
            aria-label="照片大图，放大后可滚动查看细节"
            @pointerdown="startSwipe"
            @pointerup="finishSwipe"
            @pointercancel="swipeStart = null"
          >
            <PlantImage
              :key="name + active"
              :name="name"
              :src="src"
              :photo-index="active"
              fit="contain"
              eager
            />
          </div>
          <footer class="lightbox-footer">
            <button
              v-if="count > 1"
              aria-label="大图上一张"
              @click="changePhoto(-1)"
            >
              <AppIcon name="back" :size="18" />上一张
            </button>
            <span>{{
              zoomed ? "滚动查看细节" : "左右方向键切换 · Esc 关闭"
            }}</span>
            <button
              v-if="count > 1"
              aria-label="大图下一张"
              @click="changePhoto(1)"
            >
              下一张<AppIcon name="arrow" :size="18" />
            </button>
          </footer>
        </div>
      </dialog>
    </Teleport>
  </div>
</template>
<style scoped>
.plant-gallery {
  min-width: 0;
}
.gallery-window {
  position: relative;
  height: clamp(330px, 38vw, 510px);
  overflow: hidden;
  border-radius: 21px;
  background: #192b23;
}
.gallery-track {
  display: flex;
  height: 100%;
  width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  scroll-snap-type: x mandatory;
  overscroll-behavior-x: contain;
  touch-action: pan-x pan-y;
}
.gallery-track::-webkit-scrollbar {
  display: none;
}
.gallery-track.is-dragging {
  scroll-snap-type: none;
  cursor: grabbing;
}
.gallery-slide {
  flex: 0 0 100%;
  min-width: 0;
  height: 100%;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  scroll-snap-align: start;
  scroll-snap-stop: always;
  display: block;
  cursor: zoom-in;
  translate: none !important;
  transition: none;
}
.gallery-slide :deep(.plant-image) {
  height: 100%;
  background: transparent;
}
.gallery-slide:focus-visible {
  outline-offset: -5px;
}
.gallery-count,
.gallery-open-hint {
  position: absolute;
  pointer-events: none;
  font-size: 11px;
  background: #163628cc;
  color: white;
  border: 1px solid #ffffff35;
  border-radius: 20px;
  padding: 3px 10px;
}
.gallery-count {
  top: 14px;
  right: 14px;
  font-variant-numeric: tabular-nums;
}
.gallery-open-hint {
  bottom: 14px;
  right: 14px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.gallery-arrow {
  position: absolute;
  top: 50%;
  margin-top: -19px;
  width: 38px;
  height: 38px;
  min-height: 38px;
  padding: 0;
  border: 1px solid #ffffff70;
  border-radius: 50%;
  background: #fffffff0;
  color: #254b35;
  box-shadow: 0 2px 12px #0002;
}
.gallery-arrow.previous {
  left: 13px;
}
.gallery-arrow.next {
  right: 13px;
}
.gallery-arrow:disabled {
  opacity: 0.25;
  cursor: default;
}
.gallery-caption {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  padding: 12px 0 0;
  font-size: 11px;
  color: var(--muted);
}
.gallery-help {
  font-size: 10px;
}
.gallery-dots {
  display: flex;
}
.gallery-dots button {
  min-height: 24px;
  padding: 5px;
  border: 0;
  background: transparent;
}
.gallery-dots span {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #c5d4c8;
  transition: width 0.2s;
}
.gallery-dots .active span {
  width: 19px;
  border-radius: 5px;
  background: var(--primary);
}
.gallery-compact,
.gallery-compact .gallery-window {
  width: 100%;
  height: 100%;
  border-radius: inherit;
}
.gallery-compact .gallery-window {
  background: var(--soft);
}
.gallery-compact .gallery-count {
  font-size: 10px;
  top: 11px;
  right: 11px;
  padding: 2px 8px;
}
.gallery-compact .gallery-open-hint {
  opacity: 0;
  transition: opacity 0.2s;
  bottom: 11px;
  right: 11px;
}
.gallery-compact .gallery-arrow {
  width: 30px;
  height: 30px;
  min-height: 30px;
  margin-top: -15px;
  opacity: 0;
  transition: opacity 0.2s;
}
.gallery-compact:hover .gallery-arrow:not(:disabled),
.gallery-compact:focus-within .gallery-arrow:not(:disabled),
.gallery-compact:hover .gallery-open-hint,
.gallery-compact:focus-within .gallery-open-hint {
  opacity: 1;
}
.photo-lightbox {
  position: fixed;
  inset: 0;
  width: 100vw;
  max-width: 100vw;
  height: 100dvh;
  max-height: 100dvh;
  margin: 0;
  padding: 22px;
  border: 0;
  color: white;
  background: #10251df5;
  z-index: 3000;
}
.photo-lightbox::backdrop {
  background: #10251de8;
  backdrop-filter: blur(10px);
}
.lightbox-inner {
  width: min(1300px, 100%);
  height: 100%;
  margin: auto;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  gap: 12px;
}
.lightbox-toolbar,
.lightbox-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
}
.lightbox-toolbar > div {
  display: flex;
  align-items: center;
  gap: 16px;
}
.lightbox-toolbar h2 {
  font-size: 22px;
  margin: 0;
}
.lightbox-toolbar span,
.lightbox-footer span {
  font-size: 12px;
  color: #c0d4c6;
}
.lightbox-toolbar button,
.lightbox-footer button {
  border: 1px solid #ffffff40;
  border-radius: 13px;
  background: #ffffff10;
  color: white;
  font-size: 12px;
  min-height: 40px;
}
.lightbox-close {
  width: 44px;
  padding: 5px;
}
.lightbox-scroll {
  overflow: auto;
  min-height: 0;
  background: #0c1f17;
  border-radius: 16px;
  overscroll-behavior: contain;
  touch-action: pan-y pinch-zoom;
}
.lightbox-scroll.zoomed {
  touch-action: pan-x pan-y pinch-zoom;
}
.lightbox-scroll :deep(.plant-image) {
  width: 100%;
  height: 100%;
  background: transparent;
}
.lightbox-scroll.zoomed :deep(.plant-image) {
  width: 200%;
  height: 200%;
  max-width: none;
}
@media (hover: none) {
  .gallery-compact .gallery-arrow:not(:disabled) {
    opacity: 0.95;
  }
}
@media (max-width: 650px) {
  .gallery-window {
    height: 420px;
    border-radius: 18px;
  }
  .gallery-caption {
    gap: 7px;
  }
  .gallery-help {
    display: none;
  }
  .photo-lightbox {
    padding: 12px;
  }
  .lightbox-toolbar h2 {
    font-size: 18px;
  }
  .lightbox-toolbar > div {
    gap: 9px;
  }
  .lightbox-footer {
    gap: 8px;
  }
  .lightbox-footer span {
    font-size: 10px;
    text-align: center;
  }
  .lightbox-footer button {
    font-size: 11px;
    padding: 7px 10px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .gallery-arrow,
  .gallery-dots span,
  .gallery-open-hint {
    transition: none;
  }
}
</style>

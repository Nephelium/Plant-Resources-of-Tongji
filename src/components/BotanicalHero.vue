<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { ASSET_BASE } from "../env";
import { plantLink } from "../utils/plants";
import AppIcon from "./AppIcon.vue";
import PlantImage from "./PlantImage.vue";

defineEmits<{ explore: [] }>();
const specimens = [
  {
    name: "银杏",
    latin: "Ginkgo biloba",
    note: "一把小扇子，轻轻摇着四季。",
    color: "leaf",
  },
  {
    name: "水杉",
    latin: "Metasequoia glyptostroboides",
    note: "抬头，是一整片向上的绿意。",
    color: "fern",
  },
  {
    name: "玉兰",
    latin: "Magnolia denudata",
    note: "还没长叶，春天已经站上枝头。",
    color: "petal",
  },
];
const selected = ref(0);
const specimen = computed(() => specimens[selected.value]!);
const scene = ref<HTMLElement>();
const motionPaused = ref(false);
const reducedMotion = ref(false);
let media: MediaQueryList | undefined;
function updateMotion() {
  reducedMotion.value = media?.matches ?? false;
  resetTilt();
}
function tilt(event: PointerEvent) {
  if (
    event.pointerType !== "mouse" ||
    motionPaused.value ||
    reducedMotion.value ||
    !scene.value
  )
    return;
  const rect = scene.value.getBoundingClientRect();
  scene.value.style.setProperty(
    "--tilt-x",
    `${-((event.clientY - rect.top) / rect.height - 0.5) * 8}deg`,
  );
  scene.value.style.setProperty(
    "--tilt-y",
    `${((event.clientX - rect.left) / rect.width - 0.5) * 10}deg`,
  );
}
function resetTilt() {
  scene.value?.style.setProperty("--tilt-x", "0deg");
  scene.value?.style.setProperty("--tilt-y", "0deg");
}
function toggleMotion() {
  motionPaused.value = !motionPaused.value;
  resetTilt();
}
function selectWithKey(event: KeyboardEvent, index: number) {
  let next = index;
  if (event.key === "ArrowRight") next = (index + 1) % specimens.length;
  else if (event.key === "ArrowLeft")
    next = (index + specimens.length - 1) % specimens.length;
  else if (event.key === "Home") next = 0;
  else if (event.key === "End") next = specimens.length - 1;
  else return;
  event.preventDefault();
  selected.value = next;
  scene.value
    ?.querySelector<HTMLButtonElement>(`#specimen-tab-${next}`)
    ?.focus();
}
onMounted(() => {
  media = matchMedia("(prefers-reduced-motion: reduce)");
  updateMotion();
  media.addEventListener("change", updateMotion);
});
onBeforeUnmount(() => media?.removeEventListener("change", updateMotion));
</script>

<template>
  <div class="botanical-hero">
    <div class="hero-copy">
      <div class="hero-kicker"><span></span> 同济大学 · 校园植物图鉴</div>
      <h1>
        和草木<br /><em>打个招呼。</em
        ><span class="title-spark" aria-hidden="true">✳</span>
      </h1>
      <p>
        认得一棵树，校园就多一位老朋友。<br />带上好奇心，去花与叶之间散散步。
      </p>
      <div class="hero-actions">
        <a
          href="#explore"
          class="button button-primary"
          @click.prevent="$emit('explore')"
          >沿着地图，遇见植物 <AppIcon name="arrow" :size="19"
        /></a>
        <RouterLink to="/search" class="button hero-secondary"
          ><AppIcon name="leaf" :size="18" /> 翻开植物图鉴</RouterLink
        >
      </div>
      <div class="hero-location">
        <AppIcon name="pin" :size="14" /> 上海 · 同济大学四平路校区
      </div>
    </div>
    <div
      ref="scene"
      class="botanical-scene"
      :class="{ 'motion-paused': motionPaused || reducedMotion }"
      @pointermove="tilt"
      @pointerleave="resetTilt"
    >
      <div class="scene-blob" aria-hidden="true"></div>
      <div class="scene-orbit" aria-hidden="true"></div>
      <div class="illustration-tilt">
        <img
          class="botanical-art"
          :src="ASSET_BASE + 'illustrations/botanical-garden.webp'"
          alt="银杏叶、粉色花朵与蕨叶组成的立体植物插画"
          width="1376"
          height="1152"
          fetchpriority="high"
        />
      </div>
      <span class="floating-note" aria-hidden="true"
        >今天也想<br /><strong>亲近一点自然</strong><span>↙</span></span
      >
      <div class="specimen-widget">
        <div class="specimen-tabs" role="tablist" aria-label="今天认识哪株植物">
          <button
            v-for="(plant, i) in specimens"
            :id="'specimen-tab-' + i"
            :key="plant.name"
            role="tab"
            :aria-selected="selected === i"
            :tabindex="selected === i ? 0 : -1"
            aria-controls="hero-specimen"
            :class="{ selected: selected === i }"
            :aria-label="'认识' + plant.name"
            @click="selected = i"
            @keydown="selectWithKey($event, i)"
          >
            {{ plant.name }}
          </button>
        </div>
        <div
          id="hero-specimen"
          role="tabpanel"
          :aria-labelledby="'specimen-tab-' + selected"
        >
          <Transition name="specimen" mode="out-in">
            <RouterLink
              :key="specimen.name"
              :to="plantLink(specimen.name)"
              class="specimen-card"
              :aria-label="'打开' + specimen.name + '植物档案'"
            >
              <PlantImage :name="specimen.name" eager />
              <div>
                <strong
                  >{{ specimen.name }}
                  <AppIcon name="arrow" :size="16" /></strong
                ><em>{{ specimen.latin }}</em
                ><span>{{ specimen.note }}</span>
              </div>
            </RouterLink>
          </Transition>
        </div>
      </div>
      <button
        v-if="!reducedMotion"
        class="motion-toggle"
        :aria-pressed="motionPaused"
        :aria-label="motionPaused ? '开启首页漂浮动效' : '暂停首页漂浮动效'"
        @click="toggleMotion"
      >
        {{ motionPaused ? "▷" : "Ⅱ" }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.botanical-hero {
  display: grid;
  grid-template-columns: 0.95fr 1.05fr;
  align-items: center;
  min-height: 550px;
  gap: 20px;
  padding: 12px 12px 30px;
}
.hero-copy {
  position: relative;
  z-index: 2;
  padding: 24px 0 20px 12px;
}
.hero-kicker {
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.12em;
  color: var(--primary);
}
.hero-kicker > span {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #419768;
  box-shadow: 0 0 0 5px #dceee0;
}
h1 {
  font-size: clamp(48px, 5.6vw, 76px);
  line-height: 1.3;
  letter-spacing: 0.01em;
  font-weight: 900;
  margin: 24px 0 24px;
  position: relative;
  width: fit-content;
}
h1 em {
  font-style: normal;
  color: var(--primary);
  position: relative;
}
h1 em::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: -7px;
  height: 10px;
  background: #edacc1;
  border-radius: 48% 40% 65% 35%;
  transform: rotate(-2deg);
  z-index: -1;
}
.title-spark {
  position: absolute;
  right: -49px;
  top: 9px;
  font-size: 40px;
  color: #dc8e9f;
  transform: rotate(15deg);
}
.hero-copy > p {
  font-size: 15px;
  line-height: 2;
  color: var(--muted);
  margin: 0 0 28px;
}
.hero-actions {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  max-width: 480px;
}
.hero-actions .button {
  font-size: 13px;
  font-weight: 700;
  padding: 15px 20px;
  border-radius: 18px;
}
.hero-secondary {
  background: var(--leaf-tint);
  border: 1.5px solid #8daf97;
  box-shadow: 0 4px 0 #bdd5c4;
}
.hero-secondary:hover {
  background: #dcecdf;
  transform: translateY(-3px);
  box-shadow: 0 7px 0 #bdd5c4;
}
.hero-secondary:active {
  transform: translateY(3px);
  box-shadow: 0 1px 0 #bdd5c4;
}
.hero-location {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--muted);
  margin-top: 23px;
}
.botanical-scene {
  position: relative;
  min-width: 0;
  height: 510px;
  perspective: 1000px;
  isolation: isolate;
  overflow: clip;
  overflow-clip-margin: 12px;
}
.scene-blob {
  position: absolute;
  inset: 45px -10px 48px 28px;
  background: radial-gradient(
    ellipse at 65% 50%,
    #e1eee4 0%,
    #eaf2eb 60%,
    #f1f5f0 100%
  );
  border-radius: 42% 58% 48% 52% / 55% 38% 62% 45%;
  transform: rotate(-11deg);
  z-index: -2;
}
.scene-orbit {
  position: absolute;
  inset: 20px 20px 50px 30px;
  border: 1px dashed #9cb8a7;
  border-radius: 50%;
  transform: rotate(30deg);
  z-index: -1;
}
.illustration-tilt {
  position: absolute;
  inset: 0 -12px 15px -10px;
  transform: rotateX(var(--tilt-x, 0deg)) rotateY(var(--tilt-y, 0deg));
  transition: transform 0.45s ease-out;
}
.botanical-art {
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 18px 12px #27473514);
  animation: botanical-float 7s ease-in-out infinite;
}
.floating-note {
  position: absolute;
  top: 4px;
  right: 16px;
  background: #f6dce5;
  border: 1px solid #d5a0b3;
  border-radius: 16px 20px 15px 20px;
  padding: 12px 18px;
  color: #744c63;
  font-size: 12px;
  transform: rotate(8deg);
  box-shadow: 0 5px 0 #e7c2d0;
  animation: note-float 8s ease-in-out -2s infinite;
}
.floating-note strong {
  font-size: 13px;
}
.floating-note > span {
  position: absolute;
  left: -22px;
  bottom: -25px;
  font-size: 34px;
  color: #a07188;
  transform: rotate(-12deg);
}
.specimen-widget {
  position: absolute;
  left: 7px;
  bottom: -2px;
  width: min(365px, 90%);
  transform: rotate(-3deg);
  transition: transform 0.25s;
}
.specimen-widget:focus-within,
.specimen-widget:hover {
  transform: rotate(0deg) translateY(-4px);
}
.specimen-tabs {
  display: flex;
  gap: 5px;
  padding-left: 20px;
}
.specimen-tabs button {
  border: 1px solid #a3b8a8;
  border-bottom: 0;
  min-height: 34px;
  padding: 5px 18px;
  border-radius: 12px 12px 0 0;
  font-size: 12px;
  font-weight: 600;
  background: #edf3ed;
  color: #56715f;
}
.specimen-tabs button.selected {
  background: #d3ead8;
  color: #264c36;
}
.specimen-tabs button:nth-child(3).selected {
  background: #f2dce5;
  color: #6a3f55;
}
.specimen-card {
  display: grid;
  grid-template-columns: 82px minmax(0, 1fr);
  align-items: center;
  gap: 14px;
  padding: 13px;
  background: #fffefa;
  border: 1.5px solid #799781;
  border-radius: 17px;
  box-shadow:
    0 6px 0 #c2d4c8,
    0 10px 20px #254b3212;
  min-height: 112px;
}
.specimen-card:deep(img) {
  width: 82px;
  height: 82px;
  object-fit: cover;
  object-position: 50% 15%;
  border-radius: 12px;
}
.specimen-card strong {
  font-size: 19px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--primary);
}
.specimen-card em {
  font:
    italic 11px/1.5 Georgia,
    serif;
  color: var(--muted);
  display: block;
  margin: 4px 0 5px;
  overflow-wrap: anywhere;
}
.specimen-card span {
  font-size: 10px;
  color: var(--muted);
  display: block;
}
.motion-toggle {
  position: absolute;
  right: 4px;
  bottom: 0;
  border-radius: 50%;
  background: #ffffffc9;
  min-height: 34px;
  width: 34px;
  padding: 0;
  font-size: 12px;
  color: var(--muted);
}
.specimen-enter-active,
.specimen-leave-active {
  transition:
    opacity 0.14s,
    translate 0.14s;
}
.specimen-enter-from {
  opacity: 0;
  translate: 0 6px;
}
.specimen-leave-to {
  opacity: 0;
  translate: 0 -6px;
}
@keyframes botanical-float {
  0%,
  100% {
    translate: 0 0;
    rotate: -1deg;
  }
  50% {
    translate: 0 -11px;
    rotate: 1deg;
  }
}
@keyframes note-float {
  0%,
  100% {
    translate: 0 0;
  }
  50% {
    translate: 4px 8px;
  }
}
.motion-paused .botanical-art,
.motion-paused .floating-note {
  animation-play-state: paused;
}
@media (max-width: 1100px) {
  .botanical-hero {
    gap: 0;
    min-height: 500px;
  }
  .botanical-scene {
    height: 470px;
  }
  .hero-copy {
    padding-left: 0;
  }
  h1 {
    font-size: 61px;
  }
  .hero-actions {
    gap: 12px;
  }
  .hero-actions .button {
    padding: 13px 16px;
  }
  .floating-note {
    right: 0;
  }
  .specimen-widget {
    left: 0;
  }
}
@media (max-width: 850px) {
  .botanical-hero {
    grid-template-columns: 1fr 1fr;
    padding: 0 0 25px;
  }
  .hero-copy > p {
    font-size: 13px;
  }
  h1 {
    font-size: 51px;
  }
  .title-spark {
    right: -30px;
    font-size: 27px;
  }
  .botanical-scene {
    height: 450px;
  }
  .hero-kicker {
    font-size: 10px;
  }
  .floating-note {
    font-size: 10px;
    padding: 10px 12px;
  }
  .floating-note strong {
    font-size: 11px;
  }
  .specimen-card {
    grid-template-columns: 60px minmax(0, 1fr);
    gap: 10px;
    padding: 10px;
  }
  .specimen-card:deep(img) {
    width: 60px;
    height: 70px;
  }
  .specimen-card span {
    font-size: 9px;
  }
  .specimen-tabs button {
    padding: 5px 12px;
  }
  .scene-blob {
    inset: 65px 0 60px 0;
  }
}
@media (max-width: 650px) {
  .botanical-hero {
    grid-template-columns: 1fr;
    gap: 0;
    padding: 0 0 15px;
  }
  .hero-copy {
    padding: 14px 6px 0;
  }
  h1 {
    font-size: 58px;
    margin: 20px 0 22px;
  }
  h1 br {
    display: none;
  }
  h1 {
    font-size: clamp(36px, 8.5vw, 51px);
    letter-spacing: -0.04em;
  }
  h1 em {
    display: block;
  }
  .title-spark {
    right: -42px;
    top: 10px;
    font-size: 33px;
  }
  .hero-copy > p {
    font-size: 13px;
    margin-bottom: 22px;
  }
  .hero-actions .button {
    font-size: 12px;
    padding: 12px 15px;
  }
  .hero-location {
    margin-top: 20px;
  }
  .botanical-scene {
    height: 370px;
    margin-top: 20px;
  }
  .illustration-tilt {
    inset: -15px 10px 28px 10px;
  }
  .scene-blob {
    inset: 35px 6px 55px 18px;
  }
  .floating-note {
    right: 8px;
    top: 10px;
  }
  .specimen-widget {
    width: 290px;
    bottom: 0;
    left: 6px;
  }
  .specimen-card {
    grid-template-columns: 62px minmax(0, 1fr);
    min-height: 93px;
  }
  .specimen-card:deep(img) {
    width: 62px;
    height: 68px;
  }
  .specimen-card span {
    font-size: 10px;
  }
  .specimen-card strong {
    font-size: 17px;
  }
  .scene-orbit {
    inset: 45px 50px 70px 50px;
  }
  .motion-toggle {
    bottom: 3px;
    right: 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .botanical-art,
  .floating-note {
    animation: none;
  }
  .illustration-tilt,
  .specimen-widget {
    transform: none !important;
  }
  .specimen-enter-active,
  .specimen-leave-active {
    transition: none;
  }
}
</style>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import AppIcon from "./AppIcon.vue";
import { useTheme, type ThemePreference } from "../composables/useTheme";

const { preference, resolved, setPreference } = useTheme();
const open = ref(false);
const root = ref<HTMLElement>();
const trigger = ref<HTMLButtonElement>();
const options: { value: ThemePreference; label: string; icon: string }[] = [
  { value: "system", label: "跟随系统", icon: "monitor" },
  { value: "light", label: "浅色", icon: "sun" },
  { value: "dark", label: "深色", icon: "moon" },
];
function close(restoreFocus = false) {
  open.value = false;
  if (restoreFocus) trigger.value?.focus();
}
async function toggle() {
  open.value = !open.value;
  if (open.value) {
    await nextTick();
    root.value
      ?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')
      ?.focus();
  }
}
function select(value: ThemePreference) {
  setPreference(value);
  close(true);
}
function outside(event: Event) {
  if (!root.value?.contains(event.target as Node)) close();
}
const route = useRoute();
watch(
  () => route.fullPath,
  () => close(),
);
onMounted(() => {
  document.addEventListener("pointerdown", outside);
  document.addEventListener("focusin", outside);
});
onBeforeUnmount(() => {
  document.removeEventListener("pointerdown", outside);
  document.removeEventListener("focusin", outside);
});
</script>

<template>
  <div ref="root" class="theme-control" @keydown.esc.stop="close(true)">
    <button
      ref="trigger"
      class="theme-trigger icon-button"
      :aria-label="`外观设置，当前${resolved === 'dark' ? '深色' : '浅色'}${preference === 'system' ? '，跟随系统' : ''}`"
      :aria-expanded="open"
      aria-controls="theme-options"
      title="切换浅色、深色或跟随系统"
      @click="toggle"
    >
      <AppIcon :name="resolved === 'dark' ? 'moon' : 'sun'" />
    </button>
    <Transition name="theme-panel">
      <div
        v-if="open"
        id="theme-options"
        class="theme-options"
        role="group"
        aria-label="外观模式"
      >
        <span class="theme-heading">让草木，陪你到夜晚</span>
        <button
          v-for="option in options"
          :key="option.value"
          :aria-pressed="preference === option.value"
          @click="select(option.value)"
        >
          <AppIcon :name="option.icon" :size="18" />
          <span>{{ option.label }}</span>
          <AppIcon v-if="preference === option.value" name="check" :size="16" />
        </button>
        <small v-if="preference === 'system'"
          >随设备的浅色与深色设置自动切换</small
        >
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.theme-control {
  position: relative;
  flex-shrink: 0;
}
.theme-trigger {
  color: var(--primary);
  border-radius: 50%;
  background: var(--soft);
}
.theme-options {
  position: absolute;
  right: 0;
  top: calc(100% + 14px);
  width: 225px;
  padding: 12px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 18px;
  box-shadow: 0 12px 36px var(--overlay-shadow);
}
.theme-heading {
  display: block;
  font-size: 11px;
  color: var(--muted);
  padding: 4px 8px 10px;
}
.theme-options button {
  width: 100%;
  border: 0;
  background: transparent;
  justify-content: flex-start;
  padding: 10px;
}
.theme-options button span {
  flex: 1;
  text-align: left;
}
.theme-options button:hover {
  background: var(--soft);
}
.theme-options button[aria-pressed="true"] {
  background: var(--leaf-tint);
  color: var(--primary);
  font-weight: 700;
}
.theme-options small {
  display: block;
  padding: 12px 8px 4px;
  font-size: 10px;
  color: var(--muted);
}
.theme-panel-enter-active,
.theme-panel-leave-active {
  transition:
    opacity 0.15s,
    transform 0.15s;
}
.theme-panel-enter-from,
.theme-panel-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}
</style>

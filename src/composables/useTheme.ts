import { computed, onBeforeUnmount, ref, watch } from "vue";
import { readPreference, writePreference } from "../utils/storage";

export type ThemePreference = "system" | "light" | "dark";
const key = "tongjiplants_theme";
const valid = (value: string): ThemePreference =>
  value === "light" || value === "dark" ? value : "system";

export function useTheme() {
  const preference = ref<ThemePreference>(valid(readPreference(key, "system")));
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const systemDark = ref(media.matches);
  const resolved = computed(() =>
    preference.value === "system"
      ? systemDark.value
        ? "dark"
        : "light"
      : preference.value,
  );
  watch(
    [preference, resolved],
    () => {
      const root = document.documentElement;
      root.dataset.theme = resolved.value;
      root.dataset.themePreference = preference.value;
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute(
          "content",
          resolved.value === "dark" ? "#16181b" : "#fafbf8",
        );
    },
    { immediate: true },
  );
  const onSystemChange = (event: MediaQueryListEvent) => {
    systemDark.value = event.matches;
  };
  const onStorageChange = (event: StorageEvent) => {
    if (event.key === key || event.key === null)
      preference.value = valid(event.newValue ?? "system");
  };
  media.addEventListener("change", onSystemChange);
  window.addEventListener("storage", onStorageChange);
  onBeforeUnmount(() => {
    media.removeEventListener("change", onSystemChange);
    window.removeEventListener("storage", onStorageChange);
  });
  function setPreference(value: ThemePreference) {
    preference.value = value;
    writePreference(key, value);
  }
  return { preference, resolved, setPreference };
}

import {
  computed,
  inject,
  onBeforeUnmount,
  provide,
  readonly,
  ref,
  watch,
  type ComputedRef,
  type InjectionKey,
  type Ref,
} from "vue";
import { readPreference, writePreference } from "../utils/storage";

export type ThemePreference = "system" | "light" | "dark";
const key = "tongjiplants_theme";
const valid = (value: string): ThemePreference =>
  value === "light" || value === "dark" ? value : "system";

const themeKey: InjectionKey<{
  preference: Readonly<Ref<ThemePreference>>;
  resolved: ComputedRef<"light" | "dark">;
  setPreference: (value: ThemePreference) => void;
}> = Symbol("theme");

// App owns the listeners; every consumer shares the same reactive preference.
export function provideTheme() {
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
  const theme = { preference: readonly(preference), resolved, setPreference };
  provide(themeKey, theme);
  return theme;
}

export function useTheme() {
  const theme = inject(themeKey);
  if (!theme) throw new Error("useTheme requires the App theme provider");
  return theme;
}

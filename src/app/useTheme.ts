import { ref, watch, type Ref } from "vue";
import { STORAGE_KEYS, save } from "./storage.js";

export type Theme = "light" | "dark";

export interface ThemeControls {
  theme: Ref<Theme>;
  toggleTheme: () => void;
}

/** Applied as `data-theme` on <html>, which the inline head script already set before first paint. */
export function useTheme(): ThemeControls {
  const theme = ref<Theme>(document.documentElement.dataset.theme === "dark" ? "dark" : "light");

  watch(theme, (value) => {
    document.documentElement.dataset.theme = value;
    save(STORAGE_KEYS.theme, value);
  });

  function toggleTheme(): void {
    theme.value = theme.value === "dark" ? "light" : "dark";
  }

  return { theme, toggleTheme };
}

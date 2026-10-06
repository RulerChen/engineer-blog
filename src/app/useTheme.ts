import { nextTick, ref, type Ref } from "vue";
import { STORAGE_KEYS, save } from "./storage.js";

export type Theme = "light" | "dark";

export interface ThemeControls {
  theme: Ref<Theme>;
  toggleTheme: () => void;
}

/** Applied as `data-theme` on <html>, which the inline head script already set before first paint. */
export function useTheme(): ThemeControls {
  const theme = ref<Theme>(document.documentElement.dataset.theme === "dark" ? "dark" : "light");

  async function apply(value: Theme): Promise<void> {
    theme.value = value;
    document.documentElement.dataset.theme = value;
    save(STORAGE_KEYS.theme, value);
    // The new snapshot is taken once this settles, so it must include the button's own redraw.
    await nextTick();
  }

  /** Cross-faded as two snapshots on the compositor; an instant switch where that is missing or motion is reduced. */
  function toggleTheme(): void {
    const next = theme.value === "dark" ? "light" : "dark";
    if (!document.startViewTransition || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      void apply(next);
      return;
    }
    document.startViewTransition(() => apply(next));
  }

  return { theme, toggleTheme };
}

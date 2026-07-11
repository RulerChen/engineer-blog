import { onMounted, ref, watch, type Ref } from "vue";

export type Theme = "light" | "dark";

const STORAGE_KEY = "engineer-blog-theme";

export interface ThemeControls {
  theme: Ref<Theme>;
  toggleTheme: () => void;
}

function apply(value: Theme): void {
  document.documentElement.dataset.theme = value;
}

/** Dark/light theme, persisted to localStorage and applied via `data-theme` on <html>. */
export function useTheme(): ThemeControls {
  const theme = ref<Theme>("light");

  onMounted(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "dark" || stored === "light") theme.value = stored;
      else if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) theme.value = "dark";
    } catch {
      // localStorage unavailable (private browsing, etc.) — fall back to default theme
    }
    apply(theme.value);
  });

  watch(theme, (value) => {
    apply(value);
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // ignore write failures
    }
  });

  function toggleTheme(): void {
    theme.value = theme.value === "dark" ? "light" : "dark";
  }

  return { theme, toggleTheme };
}

import { nextTick, ref, type Ref } from "vue";
import { STORAGE_KEYS, save } from "./storage.js";

export type Theme = "light" | "dark";

export interface ThemeControls {
  theme: Ref<Theme>;
  /** `origin` is the control that asked, where the new theme starts spreading from. */
  toggleTheme: (origin: Element) => void;
}

/** Rare enough to take longer than a control's 300ms; the circle covers most of the page early on. */
const REVEAL_MS = 450;

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

  /** The new page grows over a snapshot of the old in a circle from the button; an instant switch where that is missing or motion is reduced. */
  function toggleTheme(origin: Element): void {
    const next = theme.value === "dark" ? "light" : "dark";
    if (!document.startViewTransition || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      void apply(next);
      return;
    }
    const box = origin.getBoundingClientRect();
    const x = box.left + box.width / 2;
    const y = box.top + box.height / 2;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const easing = getComputedStyle(document.documentElement).getPropertyValue("--ease-out");
    // Rejected when a second click skips this transition, which needs no handling.
    document
      .startViewTransition(() => apply(next))
      .ready.then(
        () =>
          document.documentElement.animate(
            { clipPath: [`circle(0 at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
            { duration: REVEAL_MS, easing, pseudoElement: "::view-transition-new(root)" },
          ),
        () => {},
      );
  }

  return { theme, toggleTheme };
}

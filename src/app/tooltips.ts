// Once one tooltip has shown, the next one under the pointer shows at once, as native tooltips do.

/** The tooltip delay in tooltip.css. */
const SHOW_DELAY_MS = 350;
/** How long the pointer can be off every tooltip before the delay comes back. */
const COOL_MS = 300;

const tipOf = (node: EventTarget | null): Element | null =>
  node instanceof Element ? node.closest("[data-tip]") : null;

export function warmTooltips(): void {
  const root = document.documentElement;
  let showTimer: ReturnType<typeof setTimeout> | undefined;
  let coolTimer: ReturnType<typeof setTimeout> | undefined;

  document.addEventListener("pointerover", (event) => {
    const tip = tipOf(event.target);
    // Moving between a control and its own icon is not a new tooltip.
    if (!tip || tip === tipOf(event.relatedTarget)) return;
    clearTimeout(coolTimer);
    if (!("tipsWarm" in root.dataset))
      showTimer = setTimeout(() => (root.dataset.tipsWarm = ""), SHOW_DELAY_MS);
  });

  document.addEventListener("pointerout", (event) => {
    const tip = tipOf(event.target);
    if (!tip || tip === tipOf(event.relatedTarget)) return;
    clearTimeout(showTimer);
    coolTimer = setTimeout(() => delete root.dataset.tipsWarm, COOL_MS);
  });
}

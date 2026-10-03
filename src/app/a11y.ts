/** Enter or Space on an element with role="button" that is not a real button. */
export function onActivateKey(event: KeyboardEvent, act: () => void): void {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  act();
}

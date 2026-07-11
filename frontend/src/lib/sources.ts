/** Source id → display name shown on company badges and filters. */
export const sourceNames: Record<string, string> = {
  google: "Google",
  meta: "Meta",
  netflix: "Netflix",
  uber: "Uber",
  airbnb: "Airbnb",
};

export function sourceName(id: string): string {
  return sourceNames[id] ?? id;
}

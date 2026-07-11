/** Source id → display name shown on company badges and filters. */
export const sourceNames: Record<string, string> = {
  google: "Google Developers",
  meta: "Meta Engineering",
  netflix: "Netflix Tech Blog",
  uber: "Uber Engineering",
  airbnb: "Airbnb Engineering",
};

export function sourceName(id: string): string {
  return sourceNames[id] ?? id;
}

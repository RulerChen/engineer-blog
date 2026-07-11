/** Source id → display name shown on company badges and filters. */
export const sourceNames: Record<string, string> = {
  google: "Google",
  meta: "Meta",
  netflix: "Netflix",
  uber: "Uber",
  airbnb: "Airbnb",
  spotify: "Spotify",
  slack: "Slack",
  dropbox: "Dropbox",
  pinterest: "Pinterest",
};

export function sourceName(id: string): string {
  return sourceNames[id] ?? id;
}

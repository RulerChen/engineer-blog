// Every localStorage key the site owns; storage can be refused (private windows), so failures fall back to defaults.

export const STORAGE_KEYS = {
  /** Also read by the inline script vite.config.ts puts in every page's head. */
  theme: "engineer-blog-theme",
  entryState: "engineer-blog-entry-state",
  /** Saved ids from before ignoring existed; read once, then written forward under entryState. */
  legacyBookmarks: "engineer-blog-bookmarks",
  roadmapProgress: "engineer-blog-roadmap-progress",
} as const;

/** The parsed value, or null when it is missing, malformed or unreadable. */
export function loadJson(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}

export function save(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // The change then lasts only for the visit.
  }
}

/** A plain object from storage, or an empty one. */
export function loadRecord(key: string): Record<string, unknown> {
  const stored = loadJson(key);
  return stored && typeof stored === "object" && !Array.isArray(stored)
    ? (stored as Record<string, unknown>)
    : {};
}

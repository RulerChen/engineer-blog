// 24x24 stroke paths for Icon.vue.
import { type EntryType, normalizeEntryType } from "../shared/entry.js";

export const ICONS = {
  bookmark: ["M6 3.5h12v17l-6-4.2-6 4.2z"],
  eye: [
    "M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12z",
    "M14.6 12a2.6 2.6 0 1 1-5.2 0 2.6 2.6 0 0 1 5.2 0z",
  ],
  eyeOff: [
    "M4 4l16 16",
    "M9.9 5.7A9.6 9.6 0 0 1 12 5.5c6.5 0 10 6.5 10 6.5a17 17 0 0 1-3.3 4.1",
    "M6.4 7.8A16.8 16.8 0 0 0 2 12s3.5 6.5 10 6.5a9.9 9.9 0 0 0 4-.8",
    "M9.9 10.1a2.9 2.9 0 0 0 4 4",
  ],
  search: ["M18 11a7 7 0 1 1-14 0 7 7 0 0 1 14 0z", "M16.5 16.5 21 21"],
  series: ["M4 6h10M4 12h10M4 18h10M18 5v14M18 19l-2.5-2.5M18 19l2.5-2.5"],
  sun: [
    "M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0z",
    "M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41",
  ],
  moon: ["M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"],
  // Keycap glyphs, drawn because the font's arrows sit above the middle of a key and it has no return or command sign.
  arrowUp: ["M12 19V5", "M6 11l6-6 6 6"],
  arrowDown: ["M12 5v14", "M6 13l6 6 6-6"],
  enter: ["M19 5v6a4 4 0 0 1-4 4H5", "M9 11l-4 4 4 4"],
  command: ["M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3z"],
  // Three boxes joined like the topic map's, for a roadmap topic.
  roadmap: [
    "M3 4h6v4H3z",
    "M15 10h6v4h-6z",
    "M3 16h6v4H3z",
    "M9 6c3 0 3 6 6 6",
    "M9 18c3 0 3-6 6-6",
  ],
} satisfies Record<string, string[]>;

/** A new entry type needs an icon here, which is why the set is closed. */
export const ENTRY_TYPE_ICONS: Record<EntryType, { label: string; paths: string[] }> = {
  article: {
    label: "Article",
    paths: [
      "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z",
      "M14 3v5h5",
      "M9 13h6",
      "M9 17h6",
    ],
  },
  paper: {
    label: "Paper",
    paths: ["M12 4 2 9l10 5 10-5z", "M6 11.5V17c0 1.7 2.7 3 6 3s6-1.3 6-3v-5.5"],
  },
  book: {
    label: "Book",
    paths: [
      "M6.5 3H20v18H6.5A2.5 2.5 0 0 1 4 18.5v-13A2.5 2.5 0 0 1 6.5 3z",
      "M4 19.5A2.5 2.5 0 0 1 6.5 17H20",
    ],
  },
  video: {
    label: "Video",
    paths: ["M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z", "M10.5 8.5 16 12l-5.5 3.5z"],
  },
  // A screen on a stand, so a course reads apart from a video at 15px.
  course: {
    label: "Course",
    paths: ["M2 3h20", "M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3", "m7 21 5-5 5 5"],
  },
};

export function entryTypeIcon(type: EntryType | undefined): { label: string; paths: string[] } {
  return ENTRY_TYPE_ICONS[normalizeEntryType(type)];
}

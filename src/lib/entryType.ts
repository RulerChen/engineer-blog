/**
 * What an entry *is*, as opposed to what it is about: a blog post, an academic
 * paper, a book, a recorded talk. Kept to a closed set — unlike tags, this is a
 * shape the card draws an icon for, so a new value needs an icon to go with it.
 */
export type EntryType = "article" | "paper" | "book" | "video";

export const DEFAULT_ENTRY_TYPE: EntryType = "article";

export interface EntryTypeMeta {
  id: EntryType;
  /** Shown in the form and as the icon's tooltip on a card. */
  label: string;
  /** 24x24 stroke paths, drawn by EntryTypeIcon. */
  paths: string[];
}

/**
 * The whole set, in the order the form offers it — commonest first, so the
 * default is also the first button.
 */
export const ENTRY_TYPES: EntryTypeMeta[] = [
  {
    id: "article",
    label: "Article",
    paths: [
      "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z",
      "M14 3v5h5",
      "M9 13h6",
      "M9 17h6",
    ],
  },
  {
    id: "paper",
    label: "Paper",
    paths: ["M12 4 2 9l10 5 10-5z", "M6 11.5V17c0 1.7 2.7 3 6 3s6-1.3 6-3v-5.5"],
  },
  {
    id: "book",
    label: "Book",
    paths: [
      "M6.5 3H20v18H6.5A2.5 2.5 0 0 1 4 18.5v-13A2.5 2.5 0 0 1 6.5 3z",
      "M4 19.5A2.5 2.5 0 0 1 6.5 17H20",
    ],
  },
  {
    id: "video",
    label: "Video",
    paths: ["M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z", "M10.5 8.5 16 12l-5.5 3.5z"],
  },
];

const BY_ID = new Map(ENTRY_TYPES.map((meta) => [meta.id, meta]));

/**
 * Anything → a type in the set. `undefined` means the entry never said, and a
 * value outside the set is a typo in hand-edited JSON: both read as an article
 * rather than blowing up or leaving a card with no icon.
 */
export function normalizeEntryType(raw: string | undefined): EntryType {
  return raw !== undefined && BY_ID.has(raw as EntryType) ? (raw as EntryType) : DEFAULT_ENTRY_TYPE;
}

export function entryTypeMeta(raw: string | undefined): EntryTypeMeta {
  return BY_ID.get(normalizeEntryType(raw)) as EntryTypeMeta;
}

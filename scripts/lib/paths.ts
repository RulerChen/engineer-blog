import { fileURLToPath } from "node:url";

const fromRoot = (path: string): string => fileURLToPath(new URL(`../../${path}`, import.meta.url));

export const ROOT_DIR = fromRoot("");
/** One `<source>.json` of entries each; the listing is the manifest. */
export const DATA_DIR = fromRoot("data/");
/** One `<topic>.json` each, in a subdirectory because every top-level file in data/ is read as entries. */
export const ROADMAP_DIR = fromRoot("data/roadmaps/");
export const PUBLIC_DIR = fromRoot("public/");
/** Fetched by fetchIcons.ts or dropped in by hand; the listing is the manifest. */
export const ICON_DIR = fromRoot("public/icons/");

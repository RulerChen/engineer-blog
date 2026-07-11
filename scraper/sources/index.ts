import type { Source } from "../src/types.js";
import { airbnb } from "./airbnb.js";
import { google } from "./google.js";
import { meta } from "./meta.js";
import { netflix } from "./netflix.js";
import { uber } from "./uber.js";

/** Adding a source later = adding one entry here (and one module). */
export const sources: Source[] = [google, meta, netflix, uber, airbnb];

export function getSource(id: string): Source | undefined {
  return sources.find((source) => source.id === id);
}

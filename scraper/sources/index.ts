import type { Source } from "../src/types.js";
import { airbnb } from "./airbnb.js";
import { dropbox } from "./dropbox.js";
import { google } from "./google.js";
import { meta } from "./meta.js";
import { netflix } from "./netflix.js";
import { pinterest } from "./pinterest.js";
import { slack } from "./slack.js";
import { spotify } from "./spotify.js";
import { uber } from "./uber.js";

/** Adding a source later = adding one entry here (and one module). */
export const sources: Source[] = [
  google,
  meta,
  netflix,
  uber,
  airbnb,
  spotify,
  slack,
  dropbox,
  pinterest,
];

export function getSource(id: string): Source | undefined {
  return sources.find((source) => source.id === id);
}

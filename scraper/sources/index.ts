import type { Source } from "../src/types.js";
import { airbnb } from "./airbnb.js";
import { atlassian } from "./atlassian.js";
import { booking } from "./booking.js";
import { canva } from "./canva.js";
import { cloudflare } from "./cloudflare.js";
import { coinbase } from "./coinbase.js";
import { datadog } from "./datadog.js";
import { discord } from "./discord.js";
import { dropbox } from "./dropbox.js";
import { duolingo } from "./duolingo.js";
import { figma } from "./figma.js";
import { github } from "./github.js";
import { grab } from "./grab.js";
import { instagram } from "./instagram.js";
import { janestreet } from "./janestreet.js";
import { line } from "./line.js";
import { linkedin } from "./linkedin.js";
import { lyft } from "./lyft.js";
import { meta } from "./meta.js";
import { netflix } from "./netflix.js";
import { notion } from "./notion.js";
import { nvidia } from "./nvidia.js";
import { openai } from "./openai.js";
import { paypal } from "./paypal.js";
import { pinterest } from "./pinterest.js";
import { shopify } from "./shopify.js";
import { slack } from "./slack.js";
import { spotify } from "./spotify.js";
import { stripe } from "./stripe.js";
import { uber } from "./uber.js";
import { yelp } from "./yelp.js";

/** Adding a source later = adding one entry here (and one module). */
export const sources: Source[] = [
  meta,
  netflix,
  uber,
  airbnb,
  spotify,
  slack,
  dropbox,
  pinterest,
  notion,
  figma,
  stripe,
  shopify,
  discord,
  cloudflare,
  github,
  linkedin,
  coinbase,
  lyft,
  canva,
  datadog,
  paypal,
  booking,
  duolingo,
  yelp,
  grab,
  atlassian,
  openai,
  instagram,
  janestreet,
  line,
  nvidia,
];

export function getSource(id: string): Source | undefined {
  return sources.find((source) => source.id === id);
}

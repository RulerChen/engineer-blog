// Prints the numbers docs/tags.md decides vocabulary changes by; it only reports and never fails.
import type { EntryInput } from "../src/shared/entry.js";
import { sourceName } from "../src/shared/sources.js";
import { CROSS_DOMAIN, DOMAINS, TECHNOLOGIES, facetOf } from "../src/shared/tags.js";
import { isBlogEntry } from "./lib/articles.js";
import { readEntries } from "./lib/read.js";

const entries = (await readEntries()).filter(isBlogEntry);
const tagsOf = (entry: EntryInput): string[] => entry.tags ?? [];
const pct = (part: number, whole: number): string =>
  whole ? `${Math.round((100 * part) / whole)}%` : "-";
const carrying = (id: string): EntryInput[] => entries.filter((e) => tagsOf(e).includes(id));

console.log(`${entries.length} blog entries\n`);
console.log("domain               entries  also as second  no concept  names a second  top source");
for (const { id } of DOMAINS) {
  const own = entries.filter((e) => e.domain === id);
  const also = carrying(id);
  const bare = own.filter(
    (e) => !tagsOf(e).some((t) => facetOf(t) === "concept" || facetOf(t) === "cross-domain"),
  );
  const second = own.filter((e) => tagsOf(e).some((t) => facetOf(t) === "domain"));
  const sources = new Map<string, number>();
  for (const e of own) sources.set(e.source ?? "", (sources.get(e.source ?? "") ?? 0) + 1);
  const [top, topCount] = [...sources].toSorted((a, b) => b[1] - a[1])[0] ?? ["", 0];
  console.log(
    `${id.padEnd(20)} ${String(own.length).padStart(7)} ${String(also.length).padStart(15)}` +
      `  ${pct(bare.length, own.length).padStart(10)}  ${pct(second.length, own.length).padStart(14)}` +
      `  ${top ? `${sourceName(top)} ${pct(topCount, own.length)}` : "-"}`,
  );
}

// A concept whose entries mostly sit in other domains is either misplaced or listed under the wrong shelf.
console.log("\nconcept: entries (whose own domain is elsewhere)");
for (const { id: domain, concepts } of DOMAINS) {
  if (!concepts.length) continue;
  const cells = concepts.map((c) => {
    const rows = carrying(c);
    return `${c} ${rows.length}${rows.length ? ` (${rows.filter((e) => e.domain !== domain).length})` : ""}`;
  });
  console.log(`  ${domain.padEnd(20)} ${cells.join(", ")}`);
}

console.log("\ncross-domain: entries, domains they span");
for (const id of CROSS_DOMAIN) {
  const rows = carrying(id);
  console.log(
    `  ${id.padEnd(13)} ${String(rows.length).padStart(3)}  ${new Set(rows.map((e) => e.domain)).size}`,
  );
}

const concepts = DOMAINS.flatMap((d) => d.concepts);
const blogs = (id: string): number => new Set(carrying(id).map((e) => e.source)).size;
console.log(
  `\nconcepts on fewer than two entries, absorb: ${concepts.filter((c) => carrying(c).length < 2).join(", ") || "none"}`,
);
console.log(
  `technologies from fewer than two blogs, absorb: ${TECHNOLOGIES.filter((t) => blogs(t) < 2).join(", ") || "none"}`,
);

const queue = entries.filter((e) => e.domain === "other");
console.log(
  `\nother: ${queue.length}${queue.length > 5 ? ", more than a handful: a domain is missing" : ""}`,
);
for (const e of queue) console.log(`  ${e.title}`);

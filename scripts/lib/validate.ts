import type { EntryInput } from "../../src/shared/entry.js";
import { isPaperTopic } from "../../src/shared/paperTopics.js";
import { ALIASES, facetOf } from "../../src/shared/tags.js";
import { isBlogEntry } from "./articles.js";

/** About what a phone fits in the card's three clamped lines. */
const SUMMARY_MAX = 120;
const TAGS_MAX = 5;

/** docs/tags.md: one domain, at most five tags, at most one of them a second domain, every id in the vocabulary. */
function blogProblems(input: EntryInput): string[] {
  const { domain, topic } = input;
  const tags = input.tags ?? [];
  const problems: string[] = [];
  if (topic) problems.push("only a paper carries a topic");
  if (!domain) problems.push('no domain; "other" when nothing fits');
  else if (ALIASES.has(domain))
    problems.push(`domain "${domain}" was renamed to "${ALIASES.get(domain)}"`);
  else if (facetOf(domain) !== "domain") problems.push(`"${domain}" is not a domain`);
  for (const id of tags) {
    if (ALIASES.has(id)) problems.push(`"${id}" was renamed to "${ALIASES.get(id)}"`);
    else if (!facetOf(id))
      problems.push(`unknown tag "${id}"; a new technology goes in TECHNOLOGIES`);
  }
  if (tags.length > TAGS_MAX) problems.push(`${tags.length} tags, at most ${TAGS_MAX}`);
  if (new Set(tags).size < tags.length) problems.push("a tag is listed twice");
  const second = tags.filter((id) => facetOf(id) === "domain");
  if (second.length > 1) problems.push(`second domains ${second.join(", ")}; at most one`);
  if (domain && second.includes(domain)) problems.push(`"${domain}" is already the domain`);
  return problems;
}

/** AGENTS.md: a paper carries exactly one topic and no tags. */
function paperProblems(input: EntryInput): string[] {
  const problems: string[] = [];
  if (input.domain || input.tags?.length)
    problems.push("a paper carries a topic, not a domain or tags");
  if (!input.topic) problems.push("no topic; papers need one from src/shared/paperTopics.ts");
  else if (!isPaperTopic(input.topic)) problems.push(`unknown paper topic "${input.topic}"`);
  return problems;
}

function summaryProblems(input: EntryInput): string[] {
  const length = input.summary?.trim().length ?? 0;
  return length > SUMMARY_MAX ? [`summary is ${length} characters, at most ${SUMMARY_MAX}`] : [];
}

/** Every problem across the entries at once, since a vocabulary change usually breaks many together. */
export function entryProblems(inputs: EntryInput[]): string[] {
  return inputs.flatMap((input) =>
    [
      ...(isBlogEntry(input) ? blogProblems(input) : paperProblems(input)),
      ...summaryProblems(input),
    ].map((problem) => `${input.url}: ${problem}`),
  );
}

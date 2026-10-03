import type { EntryType } from "./entry.js";

/** One item as written in data/roadmaps/: a url alone for an entry on the list, full fields otherwise. */
export interface RoadmapItemInput {
  url: string;
  type?: EntryType;
  title?: string;
  /** A large company or university; left off when the only name is an author's. */
  source?: string;
  year?: string;
  /** Which lectures or chapters, when only part of a course or book is meant. */
  scope?: string;
  /** One line on why this step is here, main-line items only. */
  why?: string;
}

export interface RoadmapStepInput {
  main: RoadmapItemInput;
  /** Read first if the main item is too steep. */
  background?: RoadmapItemInput[];
  /** The same material in another language or form, read instead of the main item. */
  alternative?: RoadmapItemInput[];
  /** For after the main item. */
  further?: RoadmapItemInput[];
}

export interface RoadmapPartInput {
  name: string;
  steps: RoadmapStepInput[];
}

/** Why the field moved from one box to the next. */
export interface EvolutionLink {
  id: string;
  /** What the earlier box lacked, or what it supplied. */
  why: string;
}

/** A turning point in the field's history, whether or not the roadmap asks the reader to read it. */
export interface EvolutionNodeInput {
  id: string;
  /** Short enough for a box, like "word2vec". */
  label: string;
  era: string;
  lane: string;
  year: string;
  /** What the field could not do; only for a box that grew out of nothing on the map. */
  problem?: string;
  /** What it did about that. */
  idea: string;
  /** What it changed, or what came of it. */
  impact: string;
  /** The boxes it grew out of or replaced, each with the reason. */
  from?: EvolutionLink[];
}

export interface EvolutionEra {
  name: string;
  /** A few words on the idea that defines the era, shown under its name. */
  text: string;
  /** Two or three sentences on where the field stood and what pushed it on, shown when the era is clicked. */
  background: string;
}

/** Eras are the map's columns and lanes its rows, top to bottom, each lane one category. */
export interface EvolutionInput {
  eras: EvolutionEra[];
  lanes: string[];
  nodes: EvolutionNodeInput[];
}

export interface RoadmapInput {
  /** A topic id from the topic map. */
  id: string;
  title: string;
  /** Topic ids; built roadmaps link, the rest show as planned. */
  before: string[];
  next: string[];
  parts: RoadmapPartInput[];
  evolution?: EvolutionInput;
}

export interface RoadmapItem {
  url: string;
  type: EntryType;
  title: string;
  source?: string;
  year?: string;
  icon?: string;
  iconDark?: string;
  scope?: string;
  why?: string;
}

export interface RoadmapStep {
  main: RoadmapItem;
  background: RoadmapItem[];
  alternative: RoadmapItem[];
  further: RoadmapItem[];
}

export interface RoadmapPart {
  name: string;
  steps: RoadmapStep[];
}

export interface EvolutionNode {
  id: string;
  label: string;
  /** Index into the eras. */
  era: number;
  /** Index into the lanes. */
  lane: number;
  year: string;
  problem?: string;
  idea: string;
  impact: string;
  from: EvolutionLink[];
}

export interface Evolution {
  eras: EvolutionEra[];
  lanes: string[];
  nodes: EvolutionNode[];
}

/** A roadmap as its own file under roadmaps/ ships it, every item resolved. */
export interface Roadmap {
  id: string;
  title: string;
  before: string[];
  next: string[];
  parts: RoadmapPart[];
  evolution?: Evolution;
}

/** The ids of every built roadmap, all the topic map needs; each roadmap is a file of its own. */
export const ROADMAP_INDEX_FILE = "roadmaps/index.json";

export function roadmapFile(id: string): string {
  return `roadmaps/${encodeURIComponent(id)}.json`;
}

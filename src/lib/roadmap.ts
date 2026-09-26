import type { EntryType } from "./entryType.js";

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
  goal: string;
  steps: RoadmapStepInput[];
}

export interface RoadmapInput {
  /** A topic id from the topic map. */
  id: string;
  title: string;
  blurb: string;
  /** Topic ids; built roadmaps link, the rest show as planned. */
  before: string[];
  next: string[];
  parts: RoadmapPartInput[];
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
  goal: string;
  steps: RoadmapStep[];
}

/** A roadmap as roadmaps.json ships it, every item resolved. */
export interface Roadmap {
  id: string;
  title: string;
  blurb: string;
  before: string[];
  next: string[];
  parts: RoadmapPart[];
}

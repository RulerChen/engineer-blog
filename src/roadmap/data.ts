import { type JsonData, useJson } from "../app/fetchJson.js";
import {
  ROADMAP_INDEX_FILE,
  ROADMAP_SEARCH_FILE,
  type Roadmap,
  type RoadmapSearchItem,
  roadmapFile,
} from "../shared/roadmap.js";

/** Every roadmap item once, which only the search palette asks for. */
export function useRoadmapSearch(): JsonData<RoadmapSearchItem[]> {
  return useJson<RoadmapSearchItem[]>(ROADMAP_SEARCH_FILE, []);
}

/** Topic ids that have a roadmap, which is all the topic map needs. */
export function useRoadmapIds(): JsonData<string[]> {
  return useJson<string[]>(ROADMAP_INDEX_FILE, []);
}

/** One roadmap's own file; also asked for on hover, so the click usually finds it loaded. */
export function useRoadmap(id: string): JsonData<Roadmap | null> {
  return useJson<Roadmap | null>(roadmapFile(id), null);
}

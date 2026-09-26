import { type Ref, ref } from "vue";
import type { Roadmap } from "./roadmap.js";

export interface RoadmapData {
  roadmaps: Ref<Roadmap[]>;
  loading: Ref<boolean>;
  failed: Ref<boolean>;
}

let loaded: RoadmapData | null = null;

/** roadmaps.json, fetched once per page life so switching back to the tab is instant. */
export function useRoadmapData(): RoadmapData {
  if (loaded) return loaded;
  const data: RoadmapData = { roadmaps: ref([]), loading: ref(true), failed: ref(false) };
  loaded = data;
  void load(data);
  return data;
}

async function load(data: RoadmapData): Promise<void> {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}roadmaps.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data.roadmaps.value = (await res.json()) as Roadmap[];
  } catch {
    data.failed.value = true;
    // Not cached as failed, so the next mount tries again.
    loaded = null;
  } finally {
    data.loading.value = false;
  }
}

const PROGRESS_KEY = "engineer-blog-roadmap-progress";

/** Which items the reader has ticked, keyed by roadmap, url and scope. */
export function readProgress(): Record<string, true> {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? "{}");
    return stored && typeof stored === "object" ? (stored as Record<string, true>) : {};
  } catch {
    return {};
  }
}

export function writeProgress(done: Record<string, true>): void {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(done));
  } catch {
    // Private windows can refuse storage; progress then lasts only for the visit.
  }
}

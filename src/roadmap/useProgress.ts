import { type Ref, readonly, ref } from "vue";
import { STORAGE_KEYS, loadRecord, save } from "../app/storage.js";
import type { RoadmapItem } from "../shared/roadmap.js";

export interface Progress {
  done: Readonly<Ref<Readonly<Record<string, true>>>>;
  toggle: (key: string) => void;
}

/** Scope is part of the key, because two parts of one book are two items. */
export function progressKey(roadmapId: string, item: RoadmapItem): string {
  return `${roadmapId}|${item.url}|${item.scope ?? ""}`;
}

/** Which items the reader has ticked, written through to localStorage. */
export function useProgress(): Progress {
  const done = ref(loadRecord(STORAGE_KEYS.roadmapProgress) as Record<string, true>);

  function toggle(key: string): void {
    const next = { ...done.value };
    if (next[key]) delete next[key];
    else next[key] = true;
    done.value = next;
    save(STORAGE_KEYS.roadmapProgress, JSON.stringify(next));
  }

  return { done: readonly(done), toggle };
}

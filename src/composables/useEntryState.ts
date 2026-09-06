import { computed, onMounted, ref, type ComputedRef, type Ref } from "vue";

const STORAGE_KEY = "engineer-blog-entry-state";
/** Where saved ids lived before hidden existed — read once, then written forward. */
const LEGACY_KEY = "engineer-blog-bookmarks";

/**
 * What the reader has decided about an entry. One entry holds one of these, never
 * both: saving something you had ignored is how you take the ignore back, and the
 * single map makes that impossible to get wrong.
 */
export type EntryState = "saved" | "hidden";

export interface EntryStateControls {
  states: Ref<Record<string, EntryState>>;
  savedIds: ComputedRef<string[]>;
  hiddenIds: ComputedRef<string[]>;
  toggleSaved: (id: string) => void;
  toggleHidden: (id: string) => void;
}

function read(): Record<string, EntryState> {
  const out: Record<string, EntryState> = {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const stored: unknown = JSON.parse(raw);
      if (stored && typeof stored === "object" && !Array.isArray(stored)) {
        for (const [id, value] of Object.entries(stored)) {
          if (value === "saved" || value === "hidden") out[id] = value;
        }
      }
      return out;
    }
    const legacy: unknown = JSON.parse(localStorage.getItem(LEGACY_KEY) ?? "[]");
    if (Array.isArray(legacy)) {
      for (const id of legacy) if (typeof id === "string") out[id] = "saved";
    }
  } catch {
    // ignore malformed/unavailable storage
  }
  return out;
}

/** Per-entry saved/hidden marks, persisted to localStorage. */
export function useEntryState(): EntryStateControls {
  const states = ref<Record<string, EntryState>>({});

  onMounted(() => {
    states.value = read();
  });

  function idsWith(want: EntryState): string[] {
    return Object.keys(states.value).filter((id) => states.value[id] === want);
  }

  /**
   * Written on every toggle rather than through a deep watcher: the map is a few
   * hundred short keys at most, and a failed write should not leave the next
   * toggle thinking it succeeded.
   */
  function set(id: string, value: EntryState | null): void {
    const next = { ...states.value };
    if (value === null) delete next[id];
    else next[id] = value;
    states.value = next;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore write failures
    }
  }

  function toggle(id: string, value: EntryState): void {
    set(id, states.value[id] === value ? null : value);
  }

  return {
    states,
    savedIds: computed(() => idsWith("saved")),
    hiddenIds: computed(() => idsWith("hidden")),
    toggleSaved: (id) => toggle(id, "saved"),
    toggleHidden: (id) => toggle(id, "hidden"),
  };
}

import { type Ref, readonly, ref } from "vue";
import { STORAGE_KEYS, loadJson, loadRecord, save } from "../app/storage.js";

/** One mark per entry, so saving an ignored entry is how the ignore is taken back. */
export type EntryState = "saved" | "hidden";

export interface EntryStates {
  states: Readonly<Ref<Readonly<Record<string, EntryState>>>>;
  /** Sets the mark, or clears it when the entry already has it. */
  toggle: (id: string, state: EntryState) => void;
}

const isEntryState = (value: unknown): value is EntryState =>
  value === "saved" || value === "hidden";

function read(): Record<string, EntryState> {
  const legacy = loadJson(STORAGE_KEYS.legacyBookmarks);
  if (loadJson(STORAGE_KEYS.entryState) === null && Array.isArray(legacy)) {
    return Object.fromEntries(
      legacy.filter((id) => typeof id === "string").map((id) => [id, "saved"]),
    );
  }
  const stored = Object.entries(loadRecord(STORAGE_KEYS.entryState));
  return Object.fromEntries(
    stored.filter((entry): entry is [string, EntryState] => isEntryState(entry[1])),
  );
}

/** Saved and ignored marks, written through to localStorage on every toggle. */
export function useEntryState(): EntryStates {
  const states = ref(read());

  function toggle(id: string, state: EntryState): void {
    const next = { ...states.value };
    if (next[id] === state) delete next[id];
    else next[id] = state;
    states.value = next;
    save(STORAGE_KEYS.entryState, JSON.stringify(next));
  }

  return { states: readonly(states), toggle };
}

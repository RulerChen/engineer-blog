import { type Ref, ref } from "vue";

export interface JsonData<T> {
  data: Ref<T>;
  loading: Ref<boolean>;
  failed: Ref<boolean>;
}

/** Kept for the life of the page, so switching back to a page redraws at once instead of loading again. */
const loaded = new Map<string, JsonData<unknown>>();

/** A generated file by its path under the site root; `empty` stands in until it arrives. */
export function useJson<T>(file: string, empty: T): JsonData<T> {
  const cached = loaded.get(file);
  if (cached) return cached as JsonData<T>;
  const data: JsonData<T> = { data: ref(empty) as Ref<T>, loading: ref(true), failed: ref(false) };
  loaded.set(file, data);
  void load(file, data);
  return data;
}

async function load<T>(file: string, data: JsonData<T>): Promise<void> {
  try {
    // Same url as the preload links in the two index.html files, so this reuses that response.
    const res = await fetch(`${import.meta.env.BASE_URL}${file}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data.data.value = (await res.json()) as T;
  } catch {
    data.failed.value = true;
    // Not cached as failed, so the next mount tries again.
    loaded.delete(file);
  } finally {
    data.loading.value = false;
  }
}

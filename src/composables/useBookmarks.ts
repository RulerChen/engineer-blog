import { onMounted, ref, watch, type Ref } from "vue";

const STORAGE_KEY = "engineer-blog-bookmarks";

export interface BookmarkControls {
  bookmarks: Ref<string[]>;
  isBookmarked: (id: string) => boolean;
  toggleBookmark: (id: string) => void;
}

/** Saved-article ids, persisted to localStorage. */
export function useBookmarks(): BookmarkControls {
  const bookmarks = ref<string[]>([]);

  onMounted(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
      if (Array.isArray(stored)) bookmarks.value = stored.filter((id) => typeof id === "string");
    } catch {
      // ignore malformed/unavailable storage
    }
  });

  watch(
    bookmarks,
    (value) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
      } catch {
        // ignore write failures
      }
    },
    { deep: true },
  );

  function isBookmarked(id: string): boolean {
    return bookmarks.value.includes(id);
  }

  function toggleBookmark(id: string): void {
    bookmarks.value = isBookmarked(id)
      ? bookmarks.value.filter((x) => x !== id)
      : [...bookmarks.value, id];
  }

  return { bookmarks, isBookmarked, toggleBookmark };
}

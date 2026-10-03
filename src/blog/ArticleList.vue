<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from "vue";
import type { Article } from "../shared/entry.js";
import ArticleCard from "./ArticleCard.vue";
import type { Series } from "./series.js";
import type { EntryState } from "./useEntryState.js";

const props = defineProps<{
  articles: Article[];
  /** Changes with the filters and the tab, but not when a card is saved or ignored. */
  resetKey: string;
  seriesIndex: Map<string, Series>;
  states: Readonly<Record<string, EntryState>>;
  activeTags: string[];
}>();

const emit = defineEmits<{
  toggleSaved: [id: string];
  toggleHidden: [id: string];
  selectSeries: [id: string];
  selectTag: [tag: string];
}>();

const INITIAL_VISIBLE = 20;
const LOAD_INCREMENT = 40;
/** Start loading this far before the sentinel reaches the viewport. */
const PRELOAD_MARGIN = 600;

const visibleCount = ref(INITIAL_VISIBLE);
watch(
  () => props.resetKey,
  () => {
    visibleCount.value = INITIAL_VISIBLE;
  },
);

const sentinel = ref<HTMLElement | null>(null);
const autoLoad = typeof IntersectionObserver !== "undefined";
let observer: IntersectionObserver | null = null;
let filling = false;

/** Keeps loading while the sentinel stays in range, since one batch may not fill a tall viewport. */
async function fillViewport(): Promise<void> {
  if (filling) return;
  filling = true;
  try {
    while (visibleCount.value < props.articles.length) {
      await nextTick();
      const el = sentinel.value;
      if (!el || el.getBoundingClientRect().top > window.innerHeight + PRELOAD_MARGIN) return;
      visibleCount.value += LOAD_INCREMENT;
    }
  } finally {
    filling = false;
  }
}

watch(sentinel, (el) => {
  observer?.disconnect();
  observer = null;
  if (!el || !autoLoad) return;
  observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) void fillViewport();
    },
    { rootMargin: `0px 0px ${PRELOAD_MARGIN}px 0px` },
  );
  observer.observe(el);
});

onBeforeUnmount(() => observer?.disconnect());
</script>

<template>
  <div>
    <div class="article-list">
      <ArticleCard
        v-for="article in articles.slice(0, visibleCount)"
        :key="article.id"
        :article="article"
        :saved="states[article.id] === 'saved'"
        :hidden="states[article.id] === 'hidden'"
        :series="article.series ? seriesIndex.get(article.series) : undefined"
        :active-tags="activeTags"
        @toggle-saved="emit('toggleSaved', $event)"
        @toggle-hidden="emit('toggleHidden', $event)"
        @select-series="emit('selectSeries', $event)"
        @select-tag="emit('selectTag', $event)"
      />
    </div>
    <div v-if="visibleCount < articles.length" ref="sentinel" class="load-more-wrap">
      <button v-if="!autoLoad" class="load-more" @click="visibleCount += LOAD_INCREMENT">
        Load {{ LOAD_INCREMENT }} more
      </button>
      <span v-else class="loading-dots" aria-hidden="true"><i /><i /><i /></span>
      <span class="showing-label" aria-live="polite">
        Showing {{ Math.min(visibleCount, articles.length).toLocaleString("en-US") }} of
        {{ articles.length.toLocaleString("en-US") }}
      </span>
    </div>
  </div>
</template>

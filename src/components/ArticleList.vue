<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import type { Series } from "../lib/series.js";
import type { Article } from "../types.js";
import ArticleCard from "./ArticleCard.vue";

const props = withDefaults(
  defineProps<{
    articles: Article[];
    /** Series slug → its parts, built from the full dataset so part numbers survive filtering. */
    seriesIndex?: Map<string, Series>;
    bookmarkedIds?: string[];
    /** Ignored ids — non-empty only while hidden entries are being reviewed. */
    hiddenIds?: string[];
    /** Tags currently filtered on, forwarded to every card's tag chips. */
    activeTags?: string[];
    emptyTitle?: string;
    emptyText?: string;
    showClearButton?: boolean;
  }>(),
  {
    seriesIndex: () => new Map(),
    bookmarkedIds: () => [],
    hiddenIds: () => [],
    activeTags: () => [],
    emptyTitle: "No articles found",
    emptyText: "No articles match your filters.",
    showClearButton: false,
  },
);

const emit = defineEmits<{
  toggleBookmark: [id: string];
  toggleHidden: [id: string];
  clearFilters: [];
  selectSeries: [id: string];
  selectTag: [tag: string];
}>();

const INITIAL_VISIBLE = 20;
const LOAD_INCREMENT = 40;
/** Start loading this far before the sentinel actually reaches the viewport. */
const PRELOAD_MARGIN = 600;
const visibleCount = ref(INITIAL_VISIBLE);

watch(
  () => props.articles,
  () => {
    visibleCount.value = INITIAL_VISIBLE;
  },
);

const bookmarkedSet = computed(() => new Set(props.bookmarkedIds));
const hiddenSet = computed(() => new Set(props.hiddenIds));
const visible = computed(() => props.articles.slice(0, visibleCount.value));
const hasMore = computed(() => visibleCount.value < props.articles.length);

const sentinel = ref<HTMLElement | null>(null);
const autoLoad = typeof IntersectionObserver !== "undefined";
let observer: IntersectionObserver | null = null;
let filling = false;

/** Keep loading while the sentinel stays in range — one batch may not fill a tall viewport. */
async function fillViewport() {
  if (filling) return;
  filling = true;
  try {
    while (hasMore.value) {
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
  <div class="article-list-wrap">
    <div v-if="articles.length === 0" class="empty">
      <div class="empty-title">{{ emptyTitle }}</div>
      <div>{{ emptyText }}</div>
      <button v-if="showClearButton" class="empty-clear" @click="emit('clearFilters')">
        Clear all filters
      </button>
    </div>
    <template v-else>
      <div class="article-list">
        <ArticleCard
          v-for="article in visible"
          :key="article.id"
          :article="article"
          :bookmarked="bookmarkedSet.has(article.id)"
          :hidden="hiddenSet.has(article.id)"
          :series="article.series ? seriesIndex.get(article.series) : undefined"
          :active-tags="activeTags"
          @toggle-bookmark="emit('toggleBookmark', $event)"
          @toggle-hidden="emit('toggleHidden', $event)"
          @select-series="emit('selectSeries', $event)"
          @select-tag="emit('selectTag', $event)"
        />
      </div>
      <div v-if="hasMore" ref="sentinel" class="load-more-wrap">
        <button v-if="!autoLoad" class="load-more" @click="visibleCount += LOAD_INCREMENT">
          Load {{ LOAD_INCREMENT }} more
        </button>
        <span v-else class="loading-dots" aria-hidden="true"><i /><i /><i /></span>
        <span class="showing-label" aria-live="polite">
          Showing {{ visible.length.toLocaleString("en-US") }} of
          {{ articles.length.toLocaleString("en-US") }}
        </span>
      </div>
    </template>
  </div>
</template>

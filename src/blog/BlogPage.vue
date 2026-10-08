<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watchEffect } from "vue";
import Icon from "../app/Icon.vue";
import { ICONS } from "../app/icons.js";
import ArticleList from "./ArticleList.vue";
import FilterBar from "./FilterBar.vue";
import { shownCount, useArticles } from "./data.js";
import { resetFilter, toggled } from "./filter.js";
import { buildSeriesIndex, seriesLabel } from "./series.js";
import { stateToQuery } from "./urlState.js";
import { useArticleFilter } from "./useArticleFilter.js";
import { type EntryState, useEntryState } from "./useEntryState.js";

const { data: articles, loading, failed } = useArticles();
const { state, filtered, companies, tags } = useArticleFilter(articles);
const { states, toggle, set } = useEntryState();

/** Ignored is a list of its own, never mixed back into All, and the standing way back to anything dismissed. */
type View = "all" | EntryState;
const view = ref<View>("all");
/** The marks whose toggle takes a card out of this tab: only an ignore in All, either one elsewhere. */
const removes = computed<EntryState[]>(() =>
  view.value === "all" ? ["hidden"] : ["saved", "hidden"],
);

const TABS: {
  view: View;
  label: string;
  icon?: { paths: string[]; filled?: boolean; strokeWidth: number };
}[] = [
  { view: "all", label: "All" },
  { view: "saved", label: "Saved", icon: { paths: ICONS.bookmark, filled: true, strokeWidth: 0 } },
  { view: "hidden", label: "Ignored", icon: { paths: ICONS.eyeOff, strokeWidth: 2.4 } },
];

const seriesIndex = computed(() => buildSeriesIndex(articles.value));
/** A URL can name a series the index dropped, which still needs a label. */
const activeSeriesLabel = computed(() =>
  state.series ? (seriesIndex.value.get(state.series)?.label ?? seriesLabel(state.series)) : null,
);

/** The list is newest first, so the last entry dates the far end of the date picker. */
const earliestYear = computed(() => {
  const oldest = articles.value.at(-1);
  return oldest ? Number(oldest.publishedAt.slice(0, 4)) : new Date().getFullYear();
});

const shown = computed(() => {
  const list = filtered.value.filter((article) => {
    const mark = states.value[article.id];
    return view.value === "all" ? mark !== "hidden" : mark === view.value;
  });
  // Narrowed to one series, the list is read start to finish, so oldest first.
  return state.series ? list.toReversed() : list;
});

watchEffect(() => {
  shownCount.value = loading.value || failed.value ? null : shown.value.length;
});

/** How long a mark that took a card out of the list can be taken back. */
const UNDO_MS = 5000;

const undo = ref<{ id: string; before: EntryState | undefined; text: string } | null>(null);
let undoTimer: ReturnType<typeof setTimeout> | undefined;
/** Set only for the render that brings the card back, so a later remount does not unfold it again. */
const arriving = ref<string | null>(null);

onBeforeUnmount(() => {
  shownCount.value = null;
  clearTimeout(undoTimer);
});

function undoText(before: EntryState | undefined, after: EntryState | undefined): string {
  if (after === "hidden") return "Entry ignored";
  if (after === "saved") return "Moved to saved";
  return before === "saved" ? "Removed from saved" : "Back in the list";
}

/** A toggle that takes the card out of this tab leaves a few seconds to take it back. */
function toggleMark(id: string, entryState: EntryState): void {
  const before = states.value[id];
  toggle(id, entryState);
  if (!removes.value.includes(entryState)) return;
  undo.value = { id, before, text: undoText(before, states.value[id]) };
  clearTimeout(undoTimer);
  undoTimer = setTimeout(() => (undo.value = null), UNDO_MS);
}

async function takeBack(): Promise<void> {
  if (!undo.value) return;
  arriving.value = undo.value.id;
  set(undo.value.id, undo.value.before);
  undo.value = null;
  clearTimeout(undoTimer);
  await nextTick();
  arriving.value = null;
}

const EMPTY_VIEW: Record<EntryState, { title: string; text: string }> = {
  saved: {
    title: "No saved entries yet",
    text: "Tap the bookmark on any entry to keep it here for later.",
  },
  hidden: {
    title: "Nothing ignored",
    text: "Dismiss an entry and it lands here, out of the main list until you put it back.",
  },
};

const empty = computed(() => {
  if (view.value !== "all" && !Object.values(states.value).includes(view.value)) {
    return EMPTY_VIEW[view.value];
  }
  if (articles.value.length === 0) {
    return {
      title: "Nothing here yet",
      text: "The reading list is built from the files in data/ — none loaded.",
    };
  }
  return {
    title: "No entries found",
    text: "No entries match your filters. Try widening the date range or removing a filter.",
  };
});

function selectSeries(id: string): void {
  state.series = id;
  view.value = "all";
  window.scrollTo({ top: 0 });
}

/** Toggles like the topic menu; adding jumps up, since the list under the pointer is replaced and there is nothing to scroll past. */
function selectTag(tag: string): void {
  const adding = !state.tags.includes(tag);
  state.tags = toggled(state.tags, tag);
  if (adding) window.scrollTo({ top: 0 });
}
</script>

<template>
  <div>
    <!-- The list fades in like a page; the loading line leaves at once, so it never holds up a list that is ready. -->
    <Transition
      mode="out-in"
      enter-from-class="page-enter-from"
      enter-active-class="page-enter-active"
    >
      <p v-if="loading" class="loading">Loading entries…</p>
      <p v-else-if="failed" class="error">Could not load entries. Try refreshing.</p>
      <div v-else class="layout">
        <FilterBar
          :state="state"
          :companies="companies"
          :tags="tags"
          :min-year="earliestYear"
          :series-label="activeSeriesLabel"
        >
          <template #end>
            <div
              class="tabs segmented"
              :style="{
                '--count': TABS.length,
                '--index': TABS.findIndex((tab) => tab.view === view),
              }"
            >
              <!-- Icon-only past All, so the tabs fit the filter row; the tooltip names them. -->
              <button
                v-for="tab in TABS"
                :key="tab.view"
                class="tab-button"
                :class="{ active: view === tab.view }"
                :aria-label="tab.icon ? tab.label : undefined"
                :data-tip="tab.icon ? tab.label : undefined"
                @click="view = tab.view"
              >
                <Icon v-if="tab.icon" v-bind="tab.icon" :size="14" />
                <span v-else>{{ tab.label }}</span>
              </button>
            </div>
          </template>
        </FilterBar>

        <div v-if="shown.length === 0" class="empty">
          <div class="empty-title">{{ empty.title }}</div>
          <div>{{ empty.text }}</div>
          <button
            v-if="view === 'all' && articles.length > 0"
            class="empty-clear"
            @click="resetFilter(state)"
          >
            Clear all filters
          </button>
        </div>
        <ArticleList
          v-else
          :articles="shown"
          :reset-key="`${view}?${stateToQuery(state)}`"
          :series-index="seriesIndex"
          :states="states"
          :active-tags="state.tags"
          :removes="removes"
          :arriving="arriving"
          @toggle-saved="toggleMark($event, 'saved')"
          @toggle-hidden="toggleMark($event, 'hidden')"
          @select-series="selectSeries"
          @select-tag="selectTag"
        />
      </div>
    </Transition>
    <!-- Always present, so screen readers announce the message that appears in it. -->
    <div class="toast-region" role="status">
      <Transition name="toast">
        <div v-if="undo" class="undo-toast">
          <span>{{ undo.text }}</span>
          <button class="undo-button" @click="takeBack">Undo</button>
        </div>
      </Transition>
    </div>
  </div>
</template>

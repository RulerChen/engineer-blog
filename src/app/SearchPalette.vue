<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue";
import { useArticles } from "../blog/data.js";
import { matches, parseQuery, scoreArticle, scoreRoadmapItem } from "../blog/search.js";
import { useRoadmapIds, useRoadmapSearch } from "../roadmap/data.js";
import type { Article } from "../shared/entry.js";
import type { RoadmapSearchItem } from "../shared/roadmap.js";
import { sourceName } from "../shared/sources.js";
import { TOPIC_NODES, topicLabel } from "../shared/topicMap.js";
import EntryTypeIcon from "./EntryTypeIcon.vue";
import Icon from "./Icon.vue";
import SourceIcon from "./SourceIcon.vue";
import type { JsonData } from "./fetchJson.js";
import { ICONS } from "./icons.js";
import { openTopic, searchList } from "./pages.js";

/** Rows per group, enough to pick from; past this the query wants another word, or the list. */
const GROUP_SIZE = 10;
const IS_MAC = /Mac|iPhone|iPad/.test(navigator.userAgent);
const MONTH_FORMAT = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short" });

type Result =
  | { kind: "topic"; id: string; label: string }
  | { kind: "entry"; article: Article }
  | { kind: "list"; count: number }
  | { kind: "item"; item: RoadmapSearchItem };

/** The "show all in the list" row closes the entries it counts, so it shares their heading. */
const GROUP_NAMES: Record<Result["kind"], string> = {
  topic: "Roadmaps",
  entry: "Entries",
  list: "Entries",
  item: "In roadmaps",
};

const dialog = ref<HTMLDialogElement | null>(null);
const list = ref<HTMLElement | null>(null);
const query = ref("");
const active = ref(0);
/** Opened or closed from the keyboard, it appears and goes at once, as fast as the key that asked. */
const instant = ref(false);
/** Asked for on first open, so the roadmap page fetches no article list until someone searches. */
const articles = shallowRef<JsonData<Article[]> | null>(null);
const built = shallowRef<JsonData<string[]> | null>(null);
const items = shallowRef<JsonData<RoadmapSearchItem[]> | null>(null);

/** Every match, best first; stable, so ties keep the file's order, newest first for entries. */
function ranked<T>(values: T[], score: (value: T) => number | null): { value: T; score: number }[] {
  return values
    .flatMap((value) => {
      const result = score(value);
      return result === null ? [] : [{ value, score: result }];
    })
    .toSorted((a, b) => b.score - a.score);
}

/** Topics first, since there are few and each leads somewhere; then entries and roadmap items, the stronger group first. */
const results = computed<Result[]>(() => {
  const parsed = parseQuery(query.value);
  if (!parsed) return [];
  const ids = new Set(built.value?.data.value);
  const topics = TOPIC_NODES.flatMap((node): Result[] => {
    const label = topicLabel(node.id) ?? node.id;
    return ids.has(node.id) && matches(label, parsed)
      ? [{ kind: "topic", id: node.id, label }]
      : [];
  });
  const entries = ranked(articles.value?.data.value ?? [], (article) =>
    scoreArticle(article, parsed),
  );
  const notEntries = (items.value?.data.value ?? []).filter(
    (item) => !roadmapsOf.value.entries.has(item.url),
  );
  const found = ranked(notEntries, (item) => scoreRoadmapItem(item, parsed));
  const entryRows: Result[] = entries
    .slice(0, GROUP_SIZE)
    .map(({ value }) => ({ kind: "entry", article: value }));
  if (entries.length) entryRows.push({ kind: "list", count: entries.length });
  const itemRows = found
    .slice(0, GROUP_SIZE)
    .map(({ value }): Result => ({ kind: "item", item: value }));
  // So a paper the query names is not buried under ten posts that merely mention it; on a tie, a title that starts with the query wins.
  const lead = (top: { score: number } | undefined, title: string | undefined): number =>
    top && title !== undefined
      ? top.score + (parseQuery(title)?.folded.startsWith(parsed.folded) ? 0.5 : 0)
      : -1;
  const itemsFirst =
    lead(found[0], found[0]?.value.title) > lead(entries[0], entries[0]?.value.title);
  return [...topics, ...(itemsFirst ? [...itemRows, ...entryRows] : [...entryRows, ...itemRows])];
});

/** A roadmap item that is also a blog entry shows once, as the entry, with its roadmaps in the entry's meta. */
const roadmapsOf = computed(() => ({
  entries: new Set((articles.value?.data.value ?? []).map((article) => article.url)),
  topics: new Map((items.value?.data.value ?? []).map((item) => [item.url, item.topics])),
}));

function inRoadmaps(topics: string[] | undefined): string | undefined {
  return topics?.length ? `in ${topics.map((id) => topicLabel(id) ?? id).join(", ")}` : undefined;
}

function itemMeta(item: RoadmapSearchItem): string {
  return [item.source, item.year, inRoadmaps(item.topics)].filter(Boolean).join(" · ");
}

function entryMeta(article: Article): string {
  const date = MONTH_FORMAT.format(new Date(article.publishedAt));
  const where = inRoadmaps(roadmapsOf.value.topics.get(article.url));
  return [sourceName(article.source), date, where].filter(Boolean).join(" · ");
}

const hint = computed(() => {
  const typed = query.value.trim();
  if (!typed) return "Find an entry, a roadmap, or anything a roadmap lists";
  if (articles.value?.loading.value) return "Loading entries…";
  return `Nothing matches “${typed}”`;
});

watch(query, () => {
  active.value = 0;
  list.value?.scrollTo({ top: 0 });
});

function open(fromKeyboard: boolean): void {
  if (!dialog.value || dialog.value.open) return;
  articles.value ??= useArticles();
  built.value ??= useRoadmapIds();
  items.value ??= useRoadmapSearch();
  instant.value = fromKeyboard;
  query.value = "";
  dialog.value.showModal();
}

function close(fromKeyboard: boolean): void {
  instant.value = fromKeyboard;
  dialog.value?.close();
}

function choose(result: Result): void {
  close(false);
  if (result.kind === "topic") openTopic(result.id);
  else if (result.kind === "list") searchList(query.value.trim());
  else {
    const url = result.kind === "entry" ? result.article.url : result.item.url;
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

function onKey(event: KeyboardEvent): void {
  // Enter also confirms a word in a Chinese or Japanese input method.
  if (event.isComposing) return;
  const count = results.value.length;
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    if (count === 0) return;
    active.value = (active.value + (event.key === "ArrowDown" ? 1 : count - 1)) % count;
    void nextTick(() =>
      list.value?.querySelector(".pal-row.active")?.scrollIntoView({ block: "nearest" }),
    );
  } else if (event.key === "Enter" && results.value[active.value]) {
    event.preventDefault();
    choose(results.value[active.value]);
  }
}

/** A click on the dimmed page lands on the dialog itself, since the panel fills the dialog's box. */
function onClick(event: MouseEvent): void {
  if (event.target === dialog.value) close(false);
}

function onShortcut(event: KeyboardEvent): void {
  if (event.key.toLowerCase() !== "k" || !(event.metaKey || event.ctrlKey)) return;
  if (event.altKey || event.shiftKey) return;
  event.preventDefault();
  if (dialog.value?.open) close(true);
  else open(true);
}
onMounted(() => window.addEventListener("keydown", onShortcut));
onBeforeUnmount(() => window.removeEventListener("keydown", onShortcut));
</script>

<template>
  <!-- A click from Enter or Space has no pointer behind it, so it counts as the keyboard. -->
  <button
    class="header-button search-trigger"
    data-tip-pos="bottom"
    :data-tip="`Search · ${IS_MAC ? '⌘K' : 'Ctrl K'}`"
    aria-label="Search entries and roadmaps"
    aria-haspopup="dialog"
    aria-keyshortcuts="Meta+K Control+K"
    @click="open($event.detail === 0)"
  >
    <Icon :paths="ICONS.search" :size="17" />
    <span class="search-trigger-label">Search</span>
    <kbd v-if="IS_MAC"
      ><Icon :paths="ICONS.command" :size="10" :stroke-width="2.5" /><span class="upper"
        >K</span
      ></kbd
    >
    <kbd v-else><span class="upper">Ctrl K</span></kbd>
  </button>
  <dialog
    ref="dialog"
    class="palette"
    :class="{ instant }"
    aria-label="Search"
    @click="onClick"
    @cancel="instant = true"
  >
    <div class="pal-field">
      <Icon :paths="ICONS.search" :size="18" />
      <input
        v-model="query"
        type="text"
        placeholder="Search entries and roadmaps…"
        autofocus
        role="combobox"
        aria-autocomplete="list"
        aria-controls="pal-results"
        :aria-expanded="results.length > 0"
        :aria-activedescendant="results.length ? `pal-option-${active}` : undefined"
        @keydown="onKey"
      />
      <kbd><span class="lower">esc</span></kbd>
    </div>
    <ul v-if="results.length" id="pal-results" ref="list" class="pal-results" role="listbox">
      <template v-for="(result, index) in results" :key="`${result.kind}:${index}`">
        <li
          v-if="index === 0 || GROUP_NAMES[results[index - 1].kind] !== GROUP_NAMES[result.kind]"
          class="pal-group"
          role="presentation"
        >
          {{ GROUP_NAMES[result.kind] }}
        </li>
        <!-- pointermove, not pointerenter, so rows scrolling under a still pointer do not steal the selection. -->
        <li
          :id="`pal-option-${index}`"
          class="pal-row"
          :class="{ active: index === active }"
          role="option"
          :aria-selected="index === active"
          @click="choose(result)"
          @pointermove="active = index"
        >
          <template v-if="result.kind === 'topic'">
            <span class="pal-icon pal-topic"><Icon :paths="ICONS.roadmap" :size="15" /></span>
            <span class="pal-text">
              <span class="pal-title">{{ result.label }}</span>
              <span class="pal-meta">Roadmap</span>
            </span>
          </template>
          <template v-else-if="result.kind === 'entry'">
            <SourceIcon
              class="pal-icon"
              :icon="result.article.icon"
              :icon-dark="result.article.iconDark"
              ><EntryTypeIcon :type="result.article.type" :size="14"
            /></SourceIcon>
            <span class="pal-text">
              <span class="pal-title">{{ result.article.title }}</span>
              <span class="pal-meta">{{ entryMeta(result.article) }}</span>
            </span>
          </template>
          <template v-else-if="result.kind === 'list'">
            <span class="pal-icon pal-list"><Icon :paths="ICONS.series" :size="14" /></span>
            <span class="pal-text">
              <span class="pal-title">Show all {{ result.count }} in the list</span>
              <span class="pal-meta">Narrow the blog list to “{{ query.trim() }}”</span>
            </span>
          </template>
          <template v-else>
            <SourceIcon class="pal-icon" :icon="result.item.icon" :icon-dark="result.item.iconDark"
              ><EntryTypeIcon :type="result.item.type" :size="14"
            /></SourceIcon>
            <span class="pal-text">
              <span class="pal-title">{{ result.item.title }}</span>
              <span class="pal-meta">{{ itemMeta(result.item) }}</span>
            </span>
          </template>
          <span class="pal-enter"><Icon :paths="ICONS.enter" :size="14" /></span>
        </li>
      </template>
    </ul>
    <p v-else class="pal-empty">{{ hint }}</p>
    <div class="pal-foot" aria-hidden="true">
      <span
        ><kbd><Icon :paths="ICONS.arrowUp" :size="11" :stroke-width="2.5" /></kbd
        ><kbd><Icon :paths="ICONS.arrowDown" :size="11" :stroke-width="2.5" /></kbd> move</span
      >
      <span
        ><kbd><Icon :paths="ICONS.enter" :size="11" :stroke-width="2.5" /></kbd> open</span
      >
      <span
        ><kbd><span class="lower">esc</span></kbd> close</span
      >
    </div>
  </dialog>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from "vue";
import PaperCard from "./components/PaperCard.vue";
import SearchBar from "./components/SearchBar.vue";
import SiteHeader from "./components/SiteHeader.vue";
import { useCorpusData } from "./lib/corpusData.js";
import { PAPER_SECTIONS, type PaperTopic, paperTopic } from "./lib/paperTopics.js";
import { parseQuery, scoreArticle } from "./lib/search.js";
import type { Article } from "./types.js";

const { entries: papers, loading, failed: loadError } = useCorpusData("papers");

/**
 * No saved/ignored tabs here, unlike the blog page. Those exist to triage a
 * feed — posts keep arriving and most of them are not for you. This is a closed
 * library of papers that were picked once, and nobody dismisses Lamport 1978.
 *
 * One domain is on screen at a time, optionally narrowed to one shelf. The
 * earlier version put every shelf in a column down the side and every paper in
 * one page beside it, which reads well at fifty papers and not at all at three
 * hundred: the index outgrows the viewport and the page grows without bound.
 * Two rows of buttons do not, because a domain only ever has a handful of
 * shelves and the page only ever holds one domain.
 */
interface PaperState {
  query: string;
  domain: string;
  /** The one shelf being read, or null for all of the domain's shelves. */
  shelf: string | null;
}

const state = reactive<PaperState>(readState(window.location.search));

function readState(search: string): PaperState {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const domain = PAPER_SECTIONS.find((section) => section.id === params.get("domain"));
  const shelf = domain?.topics.find((topic) => topic.id === params.get("shelf"));
  return {
    query: params.get("q") ?? "",
    domain: domain?.id ?? PAPER_SECTIONS[0].id,
    shelf: shelf?.id ?? null,
  };
}

watch(state, () => {
  const params = new URLSearchParams();
  if (state.query) params.set("q", state.query);
  if (state.domain !== PAPER_SECTIONS[0].id) params.set("domain", state.domain);
  if (state.shelf) params.set("shelf", state.shelf);
  const query = params.toString();
  history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
});

interface ShelfSummary {
  topic: PaperTopic;
  count: number;
}

/** How many papers sit on each shelf. Empty shelves are never drawn. */
const counts = computed(() => {
  const byTopic = new Map<string, number>();
  for (const paper of papers.value) {
    if (paper.topic) byTopic.set(paper.topic, (byTopic.get(paper.topic) ?? 0) + 1);
  }
  return byTopic;
});

/** The domains that have anything in them, with their non-empty shelves. */
const domains = computed(() =>
  PAPER_SECTIONS.flatMap((section) => {
    const shelves: ShelfSummary[] = section.topics.flatMap((topic) => {
      const count = counts.value.get(topic.id);
      return count ? [{ topic, count }] : [];
    });
    if (!shelves.length) return [];
    return [{ section, shelves, count: shelves.reduce((sum, shelf) => sum + shelf.count, 0) }];
  }),
);

/** The domain on screen, falling back to the first one that has papers. */
const domain = computed(
  () => domains.value.find((entry) => entry.section.id === state.domain) ?? domains.value[0],
);

/** What the page draws: the whole domain, or the one shelf picked out of it. */
const shelves = computed<ShelfSummary[]>(() => {
  const all = domain.value?.shelves ?? [];
  const one = all.find((shelf) => shelf.topic.id === state.shelf);
  return one ? [one] : all;
});

/** One card: a single paper, or the several that share a series. */
interface Card {
  key: string;
  papers: Article[];
}

/**
 * The cards of one shelf, oldest first — and a series card sits where its first
 * paper does, since that is when the line of work started. Grouping happens here
 * rather than in the data because the data is a flat list of papers and the only
 * thing that decides what shares a card is the series slug on them.
 */
function shelfCards(id: string): Card[] {
  const cards: Card[] = [];
  const bySeries = new Map<string, Card>();
  const shelf = papers.value
    .filter((entry) => entry.topic === id)
    .toSorted((a, b) => Date.parse(a.publishedAt) - Date.parse(b.publishedAt));
  for (const paper of shelf) {
    const existing = paper.series ? bySeries.get(paper.series) : undefined;
    if (existing) {
      existing.papers.push(paper);
      continue;
    }
    const card: Card = { key: paper.series ?? paper.id, papers: [paper] };
    if (paper.series) bySeries.set(paper.series, card);
    cards.push(card);
  }
  return cards;
}

/**
 * Search results, ranked by match rather than by year, and across every domain
 * rather than the one on screen — a reader who types "raft" wants the paper,
 * not to be told it is filed elsewhere. Each card says which shelf it came off.
 */
const results = computed(() => {
  const query = parseQuery(state.query);
  if (!query) return null;
  const scored: { paper: Article; score: number }[] = [];
  for (const paper of papers.value) {
    const score = scoreArticle(paper, query);
    if (score !== null) scored.push({ paper, score });
  }
  return scored.toSorted((a, b) => b.score - a.score).map((entry) => entry.paper);
});

function topicLabelOf(paper: Article): string | undefined {
  return paperTopic(paper.topic)?.label;
}

function openDomain(id: string): void {
  state.domain = id;
  // The shelves are a different set now, so the old narrowing cannot survive.
  state.shelf = null;
  window.scrollTo({ top: 0 });
}

function openShelf(id: string | null): void {
  state.shelf = id;
  window.scrollTo({ top: 0 });
}
</script>

<template>
  <div class="container">
    <SiteHeader title="Engineering Papers" :count="papers.length" />

    <p v-if="loading" class="loading">Loading papers…</p>
    <p v-else-if="loadError" class="error">Could not load papers. Try refreshing.</p>
    <div v-else class="layout">
      <SearchBar v-model="state.query" />

      <!-- Search: flat and across every shelf, so each card says where it came from. -->
      <template v-if="results">
        <div v-if="results.length === 0" class="empty">
          <div class="empty-title">No papers found</div>
          <div>No papers match your search. Try a shorter query.</div>
        </div>
        <div v-else class="paper-flat-list">
          <PaperCard
            v-for="paper in results"
            :key="paper.id"
            :papers="[paper]"
            :topic-label="topicLabelOf(paper)"
          />
        </div>
      </template>

      <template v-else-if="domain">
        <nav class="paper-nav" aria-label="Topics">
          <div class="domain-tabs">
            <button
              v-for="entry in domains"
              :key="entry.section.id"
              class="domain-tab heading-font"
              :class="{ active: entry.section.id === domain.section.id }"
              @click="openDomain(entry.section.id)"
            >
              {{ entry.section.label }}
            </button>
          </div>
          <div class="shelf-chips">
            <button class="shelf-chip" :class="{ active: !state.shelf }" @click="openShelf(null)">
              All<span class="shelf-count">{{ domain.count }}</span>
            </button>
            <button
              v-for="shelf in domain.shelves"
              :key="shelf.topic.id"
              class="shelf-chip"
              :class="{ active: state.shelf === shelf.topic.id }"
              @click="openShelf(shelf.topic.id)"
            >
              {{ shelf.topic.label }}<span class="shelf-count">{{ shelf.count }}</span>
            </button>
          </div>
        </nav>

        <div class="shelves">
          <section v-for="shelf in shelves" :key="shelf.topic.id" class="shelf">
            <h2 class="shelf-name heading-font">{{ shelf.topic.label }}</h2>
            <div class="paper-group-list">
              <PaperCard
                v-for="card in shelfCards(shelf.topic.id)"
                :key="card.key"
                :papers="card.papers"
              />
            </div>
          </section>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import PaperEntry from "./PaperEntry.vue";
import type { Article } from "../types.js";

/**
 * One card is one thing to read. Usually that is one paper; when several papers
 * are the same line of work — GFS and the reimplementation of it, Paxos and the
 * report of shipping Paxos — they share a `series` in the data and arrive here
 * together, chained oldest first inside a single card.
 *
 * That chain is the only claim of sequence the page makes. Numbering every card
 * in a shelf 1, 2, 3 claimed one everywhere, including between Borg and Dapper,
 * which have nothing to do with each other.
 */
const props = withDefaults(
  defineProps<{
    papers: Article[];
    topicLabel?: string;
  }>(),
  { topicLabel: undefined },
);

const chained = props.papers.length > 1;
</script>

<template>
  <article class="entry-card paper-card" :class="{ chained }">
    <template v-if="chained">
      <div v-for="paper in papers" :key="paper.id" class="paper-step">
        <PaperEntry :paper="paper" :topic-label="topicLabel" />
      </div>
    </template>
    <PaperEntry v-else :paper="papers[0]" :topic-label="topicLabel" />
  </article>
</template>

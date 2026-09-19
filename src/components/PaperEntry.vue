<script setup lang="ts">
import { computed, ref } from "vue";
import { sourceName } from "../lib/sources.js";
import type { Article } from "../types.js";

const props = withDefaults(
  defineProps<{
    paper: Article;
    /**
     * Which shelf it sits on. Drawn in the search results, which are ranked and
     * flat, so the heading that would have said so is not on screen.
     */
    topicLabel?: string;
  }>(),
  { topicLabel: undefined },
);

/**
 * No tag chips here, unlike the blog card. Narrowing fifty-one papers is not the
 * reader's problem, and "machine-learning, training, llm" on a paper titled
 * "DeepSeek-V3" says nothing the title did not. What the reader cannot get from
 * the title is the paper's actual claim, so the summary takes that row instead.
 *
 * The year alone, not a full date. A paper is placed by which year's ideas it
 * belongs to — nobody has ever needed the day Bigtable was presented — and the
 * bare year is what makes a 1978 entry sit legibly next to a 2024 one.
 */
const year = computed(() => props.paper.publishedAt.slice(0, 4));

/**
 * Same 404 guard as the blog card. There is no lettered fallback here: most of
 * the sources that appear on papers alone are universities that will never have
 * a mark, so an initial in a tinted circle would be the normal case rather than
 * the exception, and a column of them says nothing.
 */
const iconBroken = ref(false);
function iconUrl(file: string | undefined): string | null {
  if (!file || iconBroken.value) return null;
  return `${import.meta.env.BASE_URL}icons/${file}`;
}
const iconSrc = computed(() => iconUrl(props.paper.icon));
const iconDarkSrc = computed(() => iconUrl(props.paper.iconDark));
</script>

<template>
  <div class="body">
    <div class="meta">
      <span v-if="iconSrc" class="paper-mark">
        <img
          :src="iconSrc"
          :class="{ 'light-only': iconDarkSrc }"
          alt=""
          loading="lazy"
          decoding="async"
          @error="iconBroken = true"
        />
        <img
          v-if="iconDarkSrc"
          :src="iconDarkSrc"
          class="dark-only"
          alt=""
          loading="lazy"
          decoding="async"
          @error="iconBroken = true"
        />
      </span>
      <span v-if="paper.source" class="company">{{ sourceName(paper.source) }}</span>
      <span v-if="paper.source" class="dot">·</span>
      <time :datetime="paper.publishedAt">{{ year }}</time>
      <template v-if="topicLabel">
        <span class="dot">·</span>
        <span class="paper-topic-label">{{ topicLabel }}</span>
      </template>
    </div>
    <h2>
      <a class="title-link" :href="paper.url" target="_blank" rel="noopener noreferrer">
        {{ paper.title }}
      </a>
    </h2>
    <p v-if="paper.summary" class="summary">{{ paper.summary }}</p>
  </div>
</template>

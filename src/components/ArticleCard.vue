<script setup lang="ts">
import { computed } from "vue";
import { avatarHue } from "../lib/avatar.js";
import type { Series } from "../lib/series.js";
import { sourceName } from "../lib/sources.js";
import type { Article } from "../types.js";

const props = withDefaults(
  defineProps<{
    article: Article;
    bookmarked: boolean;
    pending?: boolean;
    /** The series this entry belongs to, if it belongs to one with other parts. */
    series?: Series;
  }>(),
  { pending: false, series: undefined },
);
const emit = defineEmits<{ toggleBookmark: [id: string]; selectSeries: [id: string] }>();

const displayDate = computed(() =>
  new Date(props.article.publishedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }),
);

/** Where this entry sits in its series, and the parts either side of it. */
const seriesPart = computed(() => {
  const series = props.series;
  if (!series) return null;
  const index = series.parts.findIndex((part) => part.id === props.article.id);
  if (index === -1) return null;
  return {
    number: index + 1,
    total: series.parts.length,
    previous: series.parts[index - 1] ?? null,
    next: series.parts[index + 1] ?? null,
  };
});

const avatarLetter = computed(() => {
  const name = sourceName(props.article.source);
  return name ? name.charAt(0) : "·";
});

const avatarStyle = computed(() => {
  const hue = `oklch(0.55 0.1 ${avatarHue(props.article.source)})`;
  return {
    background: `color-mix(in srgb, ${hue} 16%, var(--card))`,
    color: `color-mix(in srgb, ${hue} 60%, var(--ink))`,
    border: `1px solid color-mix(in srgb, ${hue} 30%, transparent)`,
  };
});
</script>

<template>
  <article class="article-card">
    <div class="avatar" :style="avatarStyle">
      {{ avatarLetter }}
    </div>
    <div class="body">
      <div class="meta">
        <span v-if="article.source" class="company">{{ sourceName(article.source) }}</span>
        <span v-if="article.source" class="dot">·</span>
        <time :datetime="article.publishedAt">{{ displayDate }}</time>
        <span v-if="pending" class="pending-badge">Pending deploy</span>
      </div>
      <h2>
        <a class="title-link" :href="article.url" target="_blank" rel="noopener noreferrer">
          {{ article.title }}
        </a>
      </h2>
      <div v-if="article.tags.length" class="tags">
        <span v-for="tag in article.tags" :key="tag" class="tag">{{ tag }}</span>
      </div>
      <div v-if="series && seriesPart" class="series-strip">
        <button
          class="series-name"
          :title="`Show only ${series.label}`"
          @click="emit('selectSeries', series.id)"
        >
          <svg
            viewBox="0 0 24 24"
            width="12"
            height="12"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M4 6h10M4 12h10M4 18h10M18 5v14M18 19l-2.5-2.5M18 19l2.5-2.5"></path>
          </svg>
          <span>{{ series.label }}</span>
        </button>
        <span class="series-part">Part {{ seriesPart.number }} of {{ seriesPart.total }}</span>
        <a
          v-if="seriesPart.previous"
          class="series-sibling"
          :href="seriesPart.previous.url"
          :title="seriesPart.previous.title"
          target="_blank"
          rel="noopener noreferrer"
        >
          ← {{ seriesPart.previous.title }}
        </a>
        <a
          v-if="seriesPart.next"
          class="series-sibling"
          :href="seriesPart.next.url"
          :title="seriesPart.next.title"
          target="_blank"
          rel="noopener noreferrer"
        >
          {{ seriesPart.next.title }} →
        </a>
      </div>
    </div>
    <button
      class="bookmark-button"
      :title="bookmarked ? 'Remove bookmark' : 'Save for later'"
      @click="emit('toggleBookmark', article.id)"
    >
      <svg
        viewBox="0 0 24 24"
        width="16"
        height="16"
        :fill="bookmarked ? 'currentColor' : 'none'"
        stroke="currentColor"
        stroke-width="2"
        stroke-linejoin="round"
      >
        <path d="M6 3.5h12v17l-6-4.2-6 4.2z"></path>
      </svg>
    </button>
  </article>
</template>

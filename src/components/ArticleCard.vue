<script setup lang="ts">
import { computed, ref } from "vue";
import { avatarHue } from "../lib/avatar.js";
import { entryTypeMeta } from "../lib/entryType.js";
import type { Series } from "../lib/series.js";
import { sourceName } from "../lib/sources.js";
import type { Article } from "../types.js";
import EntryTypeIcon from "./EntryTypeIcon.vue";

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

/** Where this entry sits in its series. */
const seriesPart = computed(() => {
  const series = props.series;
  if (!series) return null;
  const index = series.parts.findIndex((part) => part.id === props.article.id);
  if (index === -1) return null;
  return { number: index + 1, total: series.parts.length };
});

/** Tooltip for the meta-row icon — the icon itself carries no words. */
const typeLabel = computed(() => entryTypeMeta(props.article.type).label);

const avatarLetter = computed(() => {
  const name = sourceName(props.article.source);
  return name ? name.charAt(0) : "·";
});

/**
 * A cached icon can still 404 in the browser — it was deleted, or the entry is
 * one added in this session and never built. One failure per card is enough to
 * fall back to the letter for good.
 */
const iconBroken = ref(false);
const iconSrc = computed(() => {
  if (!props.article.icon || iconBroken.value) return null;
  return `${import.meta.env.BASE_URL}icons/${props.article.icon}`;
});

const avatarStyle = computed(() => {
  const hue = `oklch(0.55 0.1 ${avatarHue(props.article.source)})`;
  // A logo carries its own shape and colour, so it sits bare on the card — the
  // tint and the plate would both read as the brand's. The hue is kept for the
  // lettered fallback, which needs the frame to look like anything at all.
  if (iconSrc.value) return {};
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
      <img
        v-if="iconSrc"
        :src="iconSrc"
        alt=""
        loading="lazy"
        decoding="async"
        @error="iconBroken = true"
      />
      <template v-else>{{ avatarLetter }}</template>
    </div>
    <div class="body">
      <div class="meta">
        <EntryTypeIcon :type="article.type" :size="16" class="entry-type" :title="typeLabel" />
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
      <div v-if="article.tags.length || article.commentary?.length" class="tags">
        <span v-for="tag in article.tags" :key="tag" class="tag">{{ tag }}</span>
        <a
          v-for="link in article.commentary"
          :key="link.url"
          class="tag commentary-chip"
          :href="link.url"
          :title="`Someone else's ${entryTypeMeta(link.type).label.toLowerCase()} — ${link.url}`"
          target="_blank"
          rel="noopener noreferrer"
        >
          <EntryTypeIcon :type="link.type" :size="13" />
          {{ sourceName(link.source) }}
        </a>
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

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
    /** Ignored — only ever rendered while the reader is reviewing what they hid. */
    hidden?: boolean;
    /** The series this entry belongs to, if it belongs to one with other parts. */
    series?: Series;
    /** Tags currently filtered on, so the chips that are doing the filtering say so. */
    activeTags?: string[];
  }>(),
  { hidden: false, series: undefined, activeTags: () => [] },
);
const emit = defineEmits<{
  toggleBookmark: [id: string];
  toggleHidden: [id: string];
  selectSeries: [id: string];
  selectTag: [tag: string];
}>();

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
function iconUrl(file: string | undefined): string | null {
  if (!file || iconBroken.value) return null;
  return `${import.meta.env.BASE_URL}icons/${file}`;
}
const iconSrc = computed(() => iconUrl(props.article.icon));
/**
 * A monochrome logo ships as two files and the theme picks one. The swap is CSS
 * rather than a `theme` prop because both are a few hundred bytes and the card
 * has no other reason to know which theme it is in.
 */
const iconDarkSrc = computed(() => iconUrl(props.article.iconDark));

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
  <article class="article-card" :class="{ 'is-hidden': hidden }">
    <div class="avatar" :style="avatarStyle">
      <img
        v-if="iconSrc"
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
      <template v-if="!iconSrc">{{ avatarLetter }}</template>
    </div>
    <div class="body">
      <div class="meta">
        <span class="entry-type" :data-tip="typeLabel">
          <EntryTypeIcon :type="article.type" :size="16" />
        </span>
        <span v-if="article.source" class="company">{{ sourceName(article.source) }}</span>
        <span v-if="article.source" class="dot">·</span>
        <time :datetime="article.publishedAt">{{ displayDate }}</time>
      </div>
      <h2>
        <a class="title-link" :href="article.url" target="_blank" rel="noopener noreferrer">
          {{ article.title }}
        </a>
      </h2>
      <div v-if="article.tags.length || article.commentary?.length" class="tags">
        <button
          v-for="tag in article.tags"
          :key="tag"
          class="tag tag-filter"
          :class="{ active: activeTags.includes(tag) }"
          :data-tip="activeTags.includes(tag) ? `Stop filtering by ${tag}` : `Show only ${tag}`"
          @click="emit('selectTag', tag)"
        >
          {{ tag }}
        </button>
        <a
          v-for="link in article.commentary"
          :key="link.url"
          class="tag commentary-chip"
          :href="link.url"
          :data-tip="`Someone else's ${entryTypeMeta(link.type).label.toLowerCase()} — ${link.url}`"
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
          :data-tip="`Show only ${series.label}`"
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
    <div class="card-actions">
      <button
        class="card-action bookmark-button"
        data-tip-align="right"
        :aria-label="bookmarked ? 'Remove bookmark' : 'Save for later'"
        :data-tip="bookmarked ? 'Remove bookmark' : 'Save for later'"
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
      <button
        class="card-action ignore-button"
        data-tip-align="right"
        :class="{ active: hidden }"
        :aria-label="hidden ? 'Put this back in the list' : 'Ignore this entry'"
        :data-tip="hidden ? 'Put this back in the list' : 'Ignore — stop showing this entry'"
        @click="emit('toggleHidden', article.id)"
      >
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <template v-if="hidden">
            <path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12z"></path>
            <circle cx="12" cy="12" r="2.6"></circle>
          </template>
          <template v-else>
            <path d="M4 4l16 16"></path>
            <path d="M9.9 5.7A9.6 9.6 0 0 1 12 5.5c6.5 0 10 6.5 10 6.5a17 17 0 0 1-3.3 4.1"></path>
            <path d="M6.4 7.8A16.8 16.8 0 0 0 2 12s3.5 6.5 10 6.5a9.9 9.9 0 0 0 4-.8"></path>
            <path d="M9.9 10.1a2.9 2.9 0 0 0 4 4"></path>
          </template>
        </svg>
      </button>
    </div>
  </article>
</template>

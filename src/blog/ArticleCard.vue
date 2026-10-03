<script setup lang="ts">
import { computed } from "vue";
import EntryTypeIcon from "../app/EntryTypeIcon.vue";
import Icon from "../app/Icon.vue";
import SourceIcon from "../app/SourceIcon.vue";
import { ICONS, entryTypeIcon } from "../app/icons.js";
import type { Article } from "../shared/entry.js";
import { sourceName } from "../shared/sources.js";
import { domainLabel } from "../shared/tags.js";
import type { Series } from "./series.js";

/** Shared, because toLocaleDateString builds a formatter per call: 18 ms vs 0.6 ms across 390 cards. */
const DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

const props = withDefaults(
  defineProps<{
    article: Article;
    saved: boolean;
    /** Ignored; only ever rendered in the Ignored tab. */
    hidden: boolean;
    /** Set when the entry is one part of a series. */
    series?: Series;
    /** Tags being filtered on, so their chips can say so. */
    activeTags?: string[];
  }>(),
  { series: undefined, activeTags: () => [] },
);

const emit = defineEmits<{
  toggleSaved: [id: string];
  toggleHidden: [id: string];
  selectSeries: [id: string];
  selectTag: [tag: string];
}>();

const displayDate = computed(() => DATE_FORMAT.format(new Date(props.article.publishedAt)));

const seriesPart = computed(() => {
  const index = props.series?.parts.findIndex((part) => part.id === props.article.id) ?? -1;
  return index === -1 ? null : { number: index + 1, total: props.series!.parts.length };
});

/** The domain first, named as the topic menu names it, then the tags in the order the build sorted them. */
const chips = computed(() =>
  [props.article.domain, ...props.article.tags].filter(Boolean).map((id) => {
    const label = domainLabel(id);
    return {
      id,
      name: label ?? id,
      domain: label !== undefined,
      active: props.activeTags.includes(id),
    };
  }),
);

/** A stable hue per company, for the lettered avatar of a source with no icon. */
const avatarHue = computed(() => {
  const id = props.article.source;
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return `oklch(0.55 0.1 ${hash % 360})`;
});
const avatarLetter = computed(() => sourceName(props.article.source).charAt(0) || "·");
</script>

<template>
  <article class="entry-card article-card" :class="{ 'is-hidden': hidden }">
    <SourceIcon
      class="avatar"
      :icon="article.icon"
      :icon-dark="article.iconDark"
      :style="{ '--hue': avatarHue }"
      >{{ avatarLetter }}</SourceIcon
    >
    <div class="body">
      <div class="meta">
        <span class="entry-type" :data-tip="entryTypeIcon(article.type).label">
          <EntryTypeIcon :type="article.type" :size="16" />
        </span>
        <template v-if="article.source">
          <span class="company">{{ sourceName(article.source) }}</span>
          <span class="dot">·</span>
        </template>
        <time :datetime="article.publishedAt">{{ displayDate }}</time>
      </div>
      <h2>
        <a class="title-link" :href="article.url" target="_blank" rel="noopener noreferrer">
          {{ article.title }}
        </a>
      </h2>
      <p v-if="article.summary" class="summary">{{ article.summary }}</p>
      <div v-if="chips.length || article.commentary?.length" class="tags">
        <button
          v-for="chip in chips"
          :key="chip.id"
          class="tag tag-filter"
          :class="{ active: chip.active, 'tag-domain': chip.domain }"
          :data-tip="chip.active ? `Stop filtering by ${chip.name}` : `Show only ${chip.name}`"
          @click="emit('selectTag', chip.id)"
        >
          {{ chip.name }}
        </button>
        <a
          v-for="link in article.commentary"
          :key="link.url"
          class="tag commentary-chip"
          :href="link.url"
          :data-tip="`Someone else's ${entryTypeIcon(link.type).label.toLowerCase()} — ${link.url}`"
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
          <Icon :paths="ICONS.series" :size="12" />
          <span>{{ series.label }}</span>
        </button>
        <span class="series-part">Part {{ seriesPart.number }} of {{ seriesPart.total }}</span>
      </div>
    </div>
    <div class="card-actions">
      <button
        class="card-action bookmark-button"
        data-tip-align="right"
        :aria-label="saved ? 'Remove bookmark' : 'Save for later'"
        :data-tip="saved ? 'Remove bookmark' : 'Save for later'"
        @click="emit('toggleSaved', article.id)"
      >
        <Icon :paths="ICONS.bookmark" :filled="saved" />
      </button>
      <button
        class="card-action ignore-button"
        data-tip-align="right"
        :class="{ active: hidden }"
        :aria-label="hidden ? 'Put this back in the list' : 'Ignore this entry'"
        :data-tip="hidden ? 'Put this back in the list' : 'Ignore — stop showing this entry'"
        @click="emit('toggleHidden', article.id)"
      >
        <Icon :paths="hidden ? ICONS.eye : ICONS.eyeOff" />
      </button>
    </div>
  </article>
</template>

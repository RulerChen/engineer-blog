<script setup lang="ts">
import { computed } from "vue";
import { avatarHue } from "../lib/avatar.js";
import { sourceName } from "../lib/sources.js";
import type { Article } from "../types.js";

const props = defineProps<{ article: Article; bookmarked: boolean }>();
const emit = defineEmits<{ toggleBookmark: [id: string] }>();

const displayDate = computed(() =>
  new Date(props.article.publishedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }),
);

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
      {{ sourceName(article.source).charAt(0) }}
    </div>
    <div class="body">
      <div class="meta">
        <span class="company">{{ sourceName(article.source) }}</span>
        <span class="dot">·</span>
        <time :datetime="article.publishedAt">{{ displayDate }}</time>
      </div>
      <h2>
        <a class="title-link" :href="article.url" target="_blank" rel="noopener noreferrer">
          {{ article.title }}
        </a>
      </h2>
      <div v-if="article.tags.length" class="tags">
        <span v-for="tag in article.tags" :key="tag" class="tag">{{ tag }}</span>
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

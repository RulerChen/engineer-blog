<script setup lang="ts">
import { computed } from "vue";
import { isNew } from "../lib/filter.js";
import { sourceName } from "../lib/sources.js";
import type { Article } from "../types.js";

const props = defineProps<{ article: Article }>();

const displayDate = computed(() =>
  new Date(props.article.publishedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }),
);
</script>

<template>
  <article class="article-card">
    <img v-if="article.thumbnail" class="thumb" :src="article.thumbnail" alt="" loading="lazy" />
    <div>
      <h2>
        <a class="title-link" :href="article.url" target="_blank" rel="noopener noreferrer">
          {{ article.title }}
        </a>
      </h2>
      <div class="meta">
        <span class="badge">{{ sourceName(article.source) }}</span>
        <span v-if="isNew(article)" class="badge new">New</span>
        <time :datetime="article.publishedAt">{{ displayDate }}</time>
        <span v-for="tag in article.tags" :key="tag" class="tag">{{ tag }}</span>
      </div>
      <p v-if="article.summary" class="summary">{{ article.summary }}</p>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { Article } from "../types.js";
import ArticleCard from "./ArticleCard.vue";

const props = defineProps<{ articles: Article[] }>();

const PAGE_SIZE = 30;
const visibleCount = ref(PAGE_SIZE);

watch(
  () => props.articles,
  () => {
    visibleCount.value = PAGE_SIZE;
  },
);

const visible = computed(() => props.articles.slice(0, visibleCount.value));
const hasMore = computed(() => visibleCount.value < props.articles.length);
</script>

<template>
  <div>
    <p v-if="articles.length === 0" class="empty">No articles match your filters.</p>
    <template v-else>
      <ArticleCard v-for="article in visible" :key="article.id" :article="article" />
      <button v-if="hasMore" class="load-more" @click="visibleCount += PAGE_SIZE">
        Load more ({{ articles.length - visibleCount }} remaining)
      </button>
    </template>
  </div>
</template>

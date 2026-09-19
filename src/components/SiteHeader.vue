<script setup lang="ts">
import { computed } from "vue";
import { useTheme } from "../composables/useTheme.js";
import { type Corpus, corpus, openCorpus } from "../lib/corpus.js";

/**
 * The bar both lists sit under, including the switch between them. Which one is
 * on screen is read off the shared corpus state rather than passed in, because
 * the switch lives here: a prop would have to be threaded back down from a
 * parent that only knows what this component just told it.
 */
defineProps<{
  /** The list's own h1, so it is not the site name on both. */
  title: string;
  count?: number;
}>();

const { theme, toggleTheme } = useTheme();
const base = import.meta.env.BASE_URL;
const countTip = computed(() =>
  corpus.value === "papers" ? "Papers on the list" : "Blog entries on the list",
);

/**
 * Still a real link to a real page, so the middle click, the modifier click and
 * the crawler all get what they came for. A plain left click is the only one
 * this takes over, and it swaps the list in place instead.
 */
function switchTo(event: MouseEvent, next: Corpus): void {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return;
  }
  event.preventDefault();
  openCorpus(next);
}
</script>

<template>
  <header class="site-header">
    <div class="header-inner">
      <a class="logo-mark heading-font" :href="base" aria-label="Home">E</a>
      <h1 class="heading-font">{{ title }}</h1>
      <div class="header-spacer"></div>
      <nav class="corpus-nav" aria-label="Which list">
        <a
          class="corpus-tab"
          :class="{ active: corpus === 'articles' }"
          :href="base"
          @click="switchTo($event, 'articles')"
          >Articles</a
        >
        <a
          class="corpus-tab"
          :class="{ active: corpus === 'papers' }"
          :href="`${base}paper/`"
          @click="switchTo($event, 'papers')"
          >Papers</a
        >
      </nav>
      <span v-if="count" class="header-count" :data-tip="countTip" data-tip-pos="bottom"
        >{{ count.toLocaleString("en-US") }} entries</span
      >
      <a
        class="header-button repo-link"
        href="https://github.com/RulerChen/engineer-blog"
        target="_blank"
        rel="noopener noreferrer"
        data-tip-pos="bottom"
        data-tip-align="right"
        aria-label="Source on GitHub"
        data-tip="Source on GitHub"
      >
        <svg viewBox="0 0 16 16" width="17" height="17" fill="currentColor" aria-hidden="true">
          <path
            d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.4 7.4 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"
          ></path>
        </svg>
      </a>
      <button
        class="header-button"
        data-tip-pos="bottom"
        data-tip-align="right"
        :aria-label="theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
        :data-tip="theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
        @click="toggleTheme"
      >
        {{ theme === "dark" ? "☀" : "☾" }}
      </button>
    </div>
  </header>
</template>

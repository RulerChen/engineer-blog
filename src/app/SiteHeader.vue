<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { shownCount, useArticles } from "../blog/data.js";
import { useRoadmapIds } from "../roadmap/data.js";
import Icon from "./Icon.vue";
import SearchPalette from "./SearchPalette.vue";
import { ICONS } from "./icons.js";
import { type Page, PAGES, currentPage, openPage } from "./pages.js";
import { useTheme } from "./useTheme.js";

const { theme, toggleTheme } = useTheme();

const TABS: { page: Page; label: string }[] = [
  { page: "blog", label: "Articles" },
  { page: "roadmap", label: "Roadmaps" },
];
const activeTab = computed(() => TABS.findIndex((tab) => tab.page === currentPage.value));

/** Only the blog page counts its entries, and only it asks for them; a narrowed list says how many it kept. */
const count = computed(() => {
  if (currentPage.value !== "blog") return null;
  const total = useArticles().data.value.length;
  if (!total) return null;
  const shown = shownCount.value;
  const all = total.toLocaleString("en-US");
  return shown === null || shown === total
    ? { text: `${all} entries`, tip: "Blog entries on the list" }
    : {
        text: `${shown.toLocaleString("en-US")} of ${all}`,
        tip: "Entries shown, of all on the list",
      };
});

/** Whether content runs under the header, which is when its bottom edge shows. */
const scrolled = ref(window.scrollY > 0);
const onScroll = (): void => {
  scrolled.value = window.scrollY > 0;
};
onMounted(() => window.addEventListener("scroll", onScroll, { passive: true }));
onBeforeUnmount(() => window.removeEventListener("scroll", onScroll));

/** A real link, so middle and modifier clicks open a new tab; only a plain left click switches in place. */
function switchTo(event: MouseEvent, page: Page): void {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
    return;
  event.preventDefault();
  openPage(page);
}

/** Hovering or focusing a tab starts its fetch, so the click usually lands on data already here. */
function warm(page: Page): void {
  if (page === "blog") useArticles();
  else useRoadmapIds();
}
</script>

<template>
  <header class="site-header" :class="{ scrolled }">
    <div class="header-inner">
      <a class="logo-mark heading-font" :href="PAGES.blog.path" aria-label="Home">E</a>
      <h1 class="heading-font">{{ PAGES[currentPage].title }}</h1>
      <div class="header-spacer"></div>
      <!-- Left of the tabs, so the tabs sit in the same place on every page. -->
      <span v-if="count" class="header-count" :data-tip="count.tip" data-tip-pos="bottom">{{
        count.text
      }}</span>
      <nav
        class="page-nav segmented"
        :style="{ '--count': TABS.length, '--index': activeTab }"
        aria-label="Which list"
      >
        <a
          v-for="tab in TABS"
          :key="tab.page"
          class="page-tab"
          :class="{ active: currentPage === tab.page }"
          :href="PAGES[tab.page].path"
          @click="switchTo($event, tab.page)"
          @pointerenter="warm(tab.page)"
          @focus="warm(tab.page)"
          >{{ tab.label }}</a
        >
      </nav>
      <SearchPalette />
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
        @click="toggleTheme($event.currentTarget as Element)"
      >
        <Icon :paths="theme === 'dark' ? ICONS.sun : ICONS.moon" :size="17" />
      </button>
    </div>
  </header>
</template>

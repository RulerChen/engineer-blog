<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watchEffect } from "vue";
import { PAGES } from "../app/pages.js";
import RoadmapView from "./RoadmapView.vue";
import TopicMap from "./TopicMap.vue";
import { useRoadmap, useRoadmapIds } from "./data.js";
import { useProgress } from "./useProgress.js";

const index = useRoadmapIds();
const { done, toggle } = useProgress();

const topicInUrl = (): string | null => new URLSearchParams(window.location.search).get("topic");

/** The roadmap being read, or null for the topic map. */
const current = ref(topicInUrl());
const built = computed(() => new Set(index.data.value));

/** Null for a topic with no roadmap, typed or stale, which falls back to the map. */
const opened = computed(() => {
  const id = current.value;
  if (!id) return null;
  // Asked for before the index check, so a deep link's fetch is not held back until the index arrives.
  const file = useRoadmap(id);
  return built.value.has(id) ? file : null;
});

const loading = computed(() => index.loading.value || Boolean(opened.value?.loading.value));
const failed = computed(() => index.failed.value || Boolean(opened.value?.failed.value));
const roadmap = computed(() => opened.value?.data.value ?? null);

/** The topic's own name in the tab and in search results; the map and a loading topic keep the page's. */
watchEffect(() => {
  const title = PAGES.roadmap.title;
  document.title = roadmap.value ? `${roadmap.value.title} · ${title}` : title;
});

/** Pushed, not replaced, so the back button returns to the map. */
function go(id: string | null): void {
  history.pushState(null, "", id ? `?topic=${id}` : window.location.pathname);
  current.value = id;
}

/** Once the old view is gone, so it never jumps to the top while still fading out. */
function toTop(): void {
  window.scrollTo({ top: 0 });
}

const onPopState = (): void => {
  current.value = topicInUrl();
};
window.addEventListener("popstate", onPopState);
onBeforeUnmount(() => window.removeEventListener("popstate", onPopState));
</script>

<template>
  <div>
    <!-- The same fade as switching pages, so going into a topic and back reads like the level above. -->
    <Transition name="page" mode="out-in" @after-leave="toTop">
      <p v-if="loading" class="loading">Loading roadmaps…</p>
      <p v-else-if="failed" class="error">Could not load roadmaps. Try refreshing.</p>
      <div v-else-if="roadmap" :key="roadmap.id" class="layout wide">
        <a class="rm-back" :href="PAGES.roadmap.path" @click.prevent="go(null)">← All topics</a>
        <RoadmapView :roadmap="roadmap" :done="done" :built="built" @toggle="toggle" @open="go" />
      </div>
      <div v-else class="layout wide">
        <TopicMap :built="built" @open="go" />
      </div>
    </Transition>
  </div>
</template>

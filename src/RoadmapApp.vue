<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue";
import RoadmapView from "./components/RoadmapView.vue";
import SiteHeader from "./components/SiteHeader.vue";
import TopicMap from "./components/TopicMap.vue";
import { readProgress, useRoadmapData, writeProgress } from "./lib/roadmapData.js";

const { roadmaps, loading, failed } = useRoadmapData();

const readTopic = (): string | null => new URLSearchParams(window.location.search).get("topic");

/** The roadmap being read, or null for the topic map. */
const current = ref(readTopic());
const done = ref(readProgress());
const mapHref = `${import.meta.env.BASE_URL}roadmap/`;

const roadmap = computed(() => roadmaps.value.find((entry) => entry.id === current.value));

const built = computed(() => new Set(roadmaps.value.map((entry) => entry.id)));

/** Pushed, not replaced, so the browser's back button returns to the map. */
function go(id: string | null): void {
  history.pushState(null, "", id ? `?topic=${id}` : window.location.pathname);
  current.value = id;
  window.scrollTo({ top: 0 });
}

const onPop = (): void => {
  current.value = readTopic();
};
window.addEventListener("popstate", onPop);
onBeforeUnmount(() => window.removeEventListener("popstate", onPop));

function toggle(key: string): void {
  const next = { ...done.value };
  if (next[key]) delete next[key];
  else next[key] = true;
  done.value = next;
  writeProgress(next);
}
</script>

<template>
  <div class="container">
    <SiteHeader title="Awesome Engineering Roadmaps" />

    <p v-if="loading" class="loading">Loading roadmaps…</p>
    <p v-else-if="failed" class="error">Could not load roadmaps. Try refreshing.</p>
    <div v-else-if="roadmap" class="layout wide">
      <a class="rm-back" :href="mapHref" @click.prevent="go(null)">← All topics</a>
      <RoadmapView
        :key="roadmap.id"
        :roadmap="roadmap"
        :done="done"
        :built="built"
        @toggle="toggle"
        @open="go"
      />
    </div>
    <div v-else class="layout wide">
      <TopicMap :built="built" @open="go" />
    </div>
  </div>
</template>

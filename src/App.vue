<script setup lang="ts">
import BlogApp from "./BlogApp.vue";
import RoadmapApp from "./RoadmapApp.vue";
import { corpus } from "./lib/corpus.js";
</script>

<template>
  <!-- Out then in, so the incoming page is never drawn over the outgoing one. -->
  <Transition name="corpus" mode="out-in">
    <RoadmapApp v-if="corpus === 'roadmaps'" />
    <BlogApp v-else />
  </Transition>
</template>

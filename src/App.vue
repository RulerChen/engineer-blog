<script setup lang="ts">
import { currentPage } from "./app/pages.js";
import BlogPage from "./blog/BlogPage.vue";
import RoadmapPage from "./roadmap/RoadmapPage.vue";
</script>

<template>
  <!-- Out then in, so the incoming page is never drawn over the outgoing one. -->
  <Transition name="page" mode="out-in">
    <RoadmapPage v-if="currentPage === 'roadmap'" />
    <BlogPage v-else />
  </Transition>
</template>

<script setup lang="ts">
import SiteHeader from "./app/SiteHeader.vue";
import { currentPage } from "./app/pages.js";
import BlogPage from "./blog/BlogPage.vue";
import RoadmapPage from "./roadmap/RoadmapPage.vue";

/** Once the old page is gone, so it never jumps to the top while still fading out. */
function toTop(): void {
  window.scrollTo({ top: 0 });
}
</script>

<template>
  <div class="container">
    <!-- Outside the transition: the chrome stays put while only the page under it changes. -->
    <SiteHeader />
    <!-- Out then in, so the incoming page is never drawn over the outgoing one. -->
    <Transition name="page" mode="out-in" @after-leave="toTop">
      <RoadmapPage v-if="currentPage === 'roadmap'" />
      <BlogPage v-else />
    </Transition>
  </div>
</template>

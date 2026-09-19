<script setup lang="ts">
import BlogApp from "./BlogApp.vue";
import PaperApp from "./PaperApp.vue";
import { corpus } from "./lib/corpus.js";
</script>

<template>
  <!--
    A short cross-fade, out then in. The two lists are laid out differently — one
    row of filters against two rows of pills — so swapping them in the same frame
    reads as a glitch rather than as a switch. The fade is not decoration: it is
    what tells the eye that the thing it was reading was replaced on purpose.
  -->
  <Transition name="corpus" mode="out-in">
    <PaperApp v-if="corpus === 'papers'" />
    <BlogApp v-else />
  </Transition>
</template>

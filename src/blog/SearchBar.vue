<script setup lang="ts">
import Icon from "../app/Icon.vue";
import { ICONS } from "../app/icons.js";

/** Filters on every keystroke; only the URL write waits for typing to pause. */
const query = defineModel<string>({ required: true });
</script>

<template>
  <div class="search-bar">
    <Icon class="search-icon" :paths="ICONS.search" :size="18" />
    <input
      v-model="query"
      type="search"
      placeholder="Search entries…"
      aria-label="Search articles"
    />
  </div>
</template>

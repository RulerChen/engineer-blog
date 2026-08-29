<script setup lang="ts">
import { computed } from "vue";
import { entryTypeMeta } from "../lib/entryType.js";

const props = withDefaults(defineProps<{ type?: string; size?: number }>(), {
  type: undefined,
  size: 15,
});

const meta = computed(() => entryTypeMeta(props.type));
</script>

<template>
  <svg
    class="type-icon"
    viewBox="0 0 24 24"
    :width="size"
    :height="size"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    role="img"
    :aria-label="meta.label"
  >
    <path v-for="d in meta.paths" :key="d" :d="d"></path>
  </svg>
</template>

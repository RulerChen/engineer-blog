<script setup lang="ts">
withDefaults(
  defineProps<{
    paths: string[];
    size?: number;
    filled?: boolean;
    strokeWidth?: number;
    /** Set for an icon that carries meaning on its own; left off, it is hidden from assistive tech. */
    label?: string;
  }>(),
  { size: 16, filled: false, strokeWidth: 2, label: undefined },
);
</script>

<template>
  <svg
    viewBox="0 0 24 24"
    :width="size"
    :height="size"
    :fill="filled ? 'currentColor' : 'none'"
    stroke="currentColor"
    :stroke-width="strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
    :role="label ? 'img' : undefined"
    :aria-label="label"
    :aria-hidden="label ? undefined : 'true'"
  >
    <path v-for="d in paths" :key="d" :d="d"></path>
  </svg>
</template>

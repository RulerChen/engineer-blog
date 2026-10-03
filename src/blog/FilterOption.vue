<script setup lang="ts">
defineProps<{ checked: boolean; name: string; count: number }>();
</script>

<template>
  <button class="filter-option">
    <span class="checkbox" :class="{ checked }">
      {{ checked ? "✓" : "" }}
    </span>
    <span class="option-name">{{ name }}</span>
    <span class="option-count">{{ count }}</span>
  </button>
</template>

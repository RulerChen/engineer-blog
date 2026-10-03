<script setup lang="ts">
defineProps<{ label: string }>();
defineEmits<{ toggle: [] }>();
</script>

<template>
  <div class="filter-dropdown">
    <button class="filter-trigger" @click="$emit('toggle')">
      <span>{{ label }}</span>
      <span class="chevron">▾</span>
    </button>
    <!-- The open menu, which mounts fresh each time so its search box and pins start over. -->
    <slot />
  </div>
</template>

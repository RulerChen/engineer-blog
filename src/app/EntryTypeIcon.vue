<script setup lang="ts">
import { computed } from "vue";
import type { EntryType } from "../shared/entry.js";
import Icon from "./Icon.vue";
import { entryTypeIcon } from "./icons.js";

const props = withDefaults(defineProps<{ type?: EntryType; size?: number }>(), {
  type: undefined,
  size: 15,
});

const meta = computed(() => entryTypeIcon(props.type));
</script>

<template>
  <Icon :paths="meta.paths" :size="size" :label="meta.label" />
</template>

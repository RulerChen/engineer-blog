<script setup lang="ts">
import EntryTypeIcon from "../app/EntryTypeIcon.vue";
import SourceIcon from "../app/SourceIcon.vue";
import type { RoadmapItem } from "../shared/roadmap.js";

withDefaults(
  defineProps<{
    item: RoadmapItem;
    done: boolean;
    /** A main-line card rather than a row in a side box. */
    main?: boolean;
  }>(),
  { main: false },
);

defineEmits<{ toggle: [] }>();
</script>

<template>
  <div class="rm-item" :class="{ main, done }">
    <div class="rm-item-body">
      <input
        type="checkbox"
        class="rm-check"
        :checked="done"
        :aria-label="`Mark as read: ${item.title}`"
        @change="$emit('toggle')"
      />
      <span class="rm-type"><EntryTypeIcon :type="item.type" :size="main ? 17 : 15" /></span>
      <div class="rm-text">
        <a class="rm-title" :href="item.url" target="_blank" rel="noopener noreferrer">{{
          item.title
        }}</a>
        <span v-if="item.scope" class="rm-scope">{{ item.scope }}</span>
        <p v-if="main && item.why" class="rm-why">{{ item.why }}</p>
        <span v-if="item.source || item.year || item.links" class="rm-source">
          <SourceIcon class="rm-mark" :icon="item.icon" :icon-dark="item.iconDark" />
          {{ item.source
          }}<span v-if="item.year" class="rm-year"
            >{{ item.source ? "· " : "" }}{{ item.year }}</span
          >
          <a
            v-for="link in item.links"
            :key="link.url"
            class="rm-link"
            :href="link.url"
            target="_blank"
            rel="noopener noreferrer"
            >{{ link.label }}</a
          >
        </span>
      </div>
    </div>
  </div>
</template>

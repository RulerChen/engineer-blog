<script setup lang="ts">
import { computed, ref } from "vue";
import EntryTypeIcon from "./EntryTypeIcon.vue";
import type { RoadmapItem } from "../lib/roadmap.js";

const props = withDefaults(
  defineProps<{
    item: RoadmapItem;
    done: boolean;
    /** A main-line card rather than a row in a side box. */
    main?: boolean;
  }>(),
  { main: false },
);

defineEmits<{ toggle: [] }>();

const iconBroken = ref(false);
function iconUrl(file: string | undefined): string | null {
  if (!file || iconBroken.value) return null;
  return `${import.meta.env.BASE_URL}icons/${file}`;
}
const iconSrc = computed(() => iconUrl(props.item.icon));
const iconDarkSrc = computed(() => iconUrl(props.item.iconDark));
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
        <span v-if="item.source || item.year" class="rm-source">
          <span v-if="iconSrc" class="rm-mark">
            <img
              :src="iconSrc"
              :class="{ 'light-only': iconDarkSrc }"
              alt=""
              loading="lazy"
              decoding="async"
              @error="iconBroken = true"
            />
            <img
              v-if="iconDarkSrc"
              :src="iconDarkSrc"
              class="dark-only"
              alt=""
              loading="lazy"
              decoding="async"
              @error="iconBroken = true"
            />
          </span>
          {{ item.source
          }}<span v-if="item.year" class="rm-year"
            >{{ item.source ? "· " : "" }}{{ item.year }}</span
          >
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from "vue";
import Icon from "../app/Icon.vue";
import { ICONS } from "../app/icons.js";

const DEBOUNCE_MS = 200;

const query = defineModel<string>({ required: true });

/** What is typed, published to the model once typing pauses. */
const draft = ref(query.value);
watch(query, (value) => {
  draft.value = value;
});

let timer: ReturnType<typeof setTimeout> | undefined;
function onInput(): void {
  clearTimeout(timer);
  timer = setTimeout(() => {
    query.value = draft.value;
  }, DEBOUNCE_MS);
}
onBeforeUnmount(() => clearTimeout(timer));
</script>

<template>
  <div class="search-bar">
    <Icon class="search-icon" :paths="ICONS.search" :size="18" />
    <input
      v-model="draft"
      type="search"
      placeholder="Search entries…"
      aria-label="Search articles"
      @input="onInput"
    />
  </div>
</template>

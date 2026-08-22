<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from "vue";

const props = defineProps<{ modelValue: string }>();
const emit = defineEmits<{ "update:modelValue": [value: string] }>();

const draft = ref(props.modelValue);
watch(
  () => props.modelValue,
  (value) => {
    draft.value = value;
  },
);

let timer: ReturnType<typeof setTimeout> | undefined;
function onInput(): void {
  clearTimeout(timer);
  timer = setTimeout(() => emit("update:modelValue", draft.value), 200);
}
onBeforeUnmount(() => clearTimeout(timer));
</script>

<template>
  <div class="search-bar">
    <svg
      class="search-icon"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
    >
      <circle cx="11" cy="11" r="7"></circle>
      <line x1="16.5" y1="16.5" x2="21" y2="21"></line>
    </svg>
    <input
      v-model="draft"
      type="search"
      placeholder="Search titles…"
      aria-label="Search articles"
      @input="onInput"
    />
  </div>
</template>

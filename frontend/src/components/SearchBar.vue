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
    <input
      v-model="draft"
      type="search"
      placeholder="Search titles and summaries…"
      aria-label="Search articles"
      @input="onInput"
    />
  </div>
</template>

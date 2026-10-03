<script setup lang="ts">
import { computed, ref, useSlots } from "vue";

const props = defineProps<{
  /** File name under public/icons/. */
  icon?: string;
  /** The dark-theme copy of a monochrome logo; CSS cross-fades the pair with the theme. */
  iconDark?: string;
}>();

const slots = useSlots();
/** A built icon can still 404; one failure falls back to the slot for good. */
const broken = ref(false);
const url = (file: string | undefined): string | null =>
  file && !broken.value ? `${import.meta.env.BASE_URL}icons/${file}` : null;
const light = computed(() => url(props.icon));
const dark = computed(() => url(props.iconDark));
</script>

<template>
  <span v-if="light || slots.default" class="source-icon" :class="{ lettered: !light }">
    <template v-if="light">
      <img
        :src="light"
        :class="{ 'light-only': dark }"
        alt=""
        loading="lazy"
        decoding="async"
        @error="broken = true"
      />
      <img
        v-if="dark"
        :src="dark"
        class="dark-only"
        alt=""
        loading="lazy"
        decoding="async"
        @error="broken = true"
      />
    </template>
    <slot v-else />
  </span>
</template>

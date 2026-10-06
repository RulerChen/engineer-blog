<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";

const props = defineProps<{ label: string; open: boolean }>();
const emit = defineEmits<{ toggle: [] }>();

const trigger = ref<HTMLButtonElement | null>(null);

/** Escape closes the open menu and hands focus back to its trigger. */
function onKey(event: KeyboardEvent): void {
  if (!props.open || event.key !== "Escape") return;
  emit("toggle");
  trigger.value?.focus();
}
onMounted(() => window.addEventListener("keydown", onKey));
onBeforeUnmount(() => window.removeEventListener("keydown", onKey));
</script>

<template>
  <div class="filter-dropdown">
    <button ref="trigger" class="filter-trigger" :aria-expanded="open" @click="emit('toggle')">
      <span>{{ label }}</span>
      <span class="chevron">▾</span>
    </button>
    <!-- The open menu, which mounts fresh each time so its search box and pins start over. -->
    <Transition name="menu">
      <slot />
    </Transition>
  </div>
</template>

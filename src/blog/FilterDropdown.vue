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

/** Shifted left by however far it would run past the filter row, still growing from under its trigger. */
function fit(el: Element): void {
  const menu = el as HTMLElement;
  const bar = menu.closest(".filter-bar");
  if (!bar) return;
  // offsetWidth, because the entering scale already shrinks the rect.
  const overflow =
    menu.getBoundingClientRect().left + menu.offsetWidth - bar.getBoundingClientRect().right;
  if (overflow <= 0) return;
  menu.style.left = `${-overflow}px`;
  menu.style.transformOrigin = `${overflow}px 0`;
}
</script>

<template>
  <div class="filter-dropdown">
    <button ref="trigger" class="filter-trigger" :aria-expanded="open" @click="emit('toggle')">
      <span>{{ label }}</span>
      <span class="chevron">▾</span>
    </button>
    <!-- The open menu, which mounts fresh each time so its search box and pins start over. -->
    <Transition name="menu" @enter="fit">
      <slot />
    </Transition>
  </div>
</template>

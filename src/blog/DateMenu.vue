<script setup lang="ts">
import { computed, ref } from "vue";
import {
  MONTH_NAMES,
  currentYearMonth,
  firstDayOf,
  lastDayOf,
  rangeLabel,
  shiftMonths,
  yearMonth,
} from "./months.js";

const props = defineProps<{
  /** YYYY-MM-DD, or null for an open end. */
  from: string | null;
  to: string | null;
  /** Year of the oldest entry; the grid never goes back further. */
  minYear: number;
}>();

/** Null for both ends means any time. */
const emit = defineEmits<{ change: [from: string | null, to: string | null]; close: [] }>();

const NOW = currentYearMonth();
const CURRENT_YEAR = Number(NOW.slice(0, 4));

const fromMonth = computed(() => props.from?.slice(0, 7) ?? "");
const toMonth = computed(() => props.to?.slice(0, 7) ?? "");
const firstYear = computed(() => Math.min(props.minYear, CURRENT_YEAR));
const year = ref(fromMonth.value ? Number(fromMonth.value.slice(0, 4)) : CURRENT_YEAR);

const hint = computed(() => {
  if (!fromMonth.value) return "Pick a start month";
  if (!toMonth.value) return "Now pick an end month";
  return rangeLabel(props.from, props.to);
});

/** The first click starts a range, the second ends it, in whichever order the two months were picked. */
function pick(ym: string): void {
  if (ym > NOW) return;
  if (!fromMonth.value || toMonth.value) emit("change", firstDayOf(ym), null);
  else if (ym < fromMonth.value) emit("change", firstDayOf(ym), lastDayOf(fromMonth.value));
  else emit("change", props.from, lastDayOf(ym));
}

function monthClass(ym: string): Record<string, boolean> {
  const inRange = Boolean(
    fromMonth.value && toMonth.value && ym > fromMonth.value && ym < toMonth.value,
  );
  return {
    end: ym === fromMonth.value || ym === toMonth.value,
    "in-range": inRange,
    disabled: ym > NOW,
  };
}

function apply(from: string | null, to: string | null): void {
  emit("change", from, to);
  emit("close");
}

const PRESETS: { label: string; range: () => [string | null, string | null] }[] = [
  { label: "Last 3 months", range: () => [firstDayOf(shiftMonths(NOW, -2)), lastDayOf(NOW)] },
  { label: "Last 12 months", range: () => [firstDayOf(shiftMonths(NOW, -11)), lastDayOf(NOW)] },
  { label: "This year", range: () => [`${CURRENT_YEAR}-01-01`, lastDayOf(NOW)] },
  { label: "All time", range: () => [null, null] },
];
</script>

<template>
  <div class="filter-menu date-menu">
    <div class="date-menu-year">
      <button class="year-nav" :disabled="year <= firstYear" @click="year--">‹</button>
      <span class="year-label heading-font">{{ year }}</span>
      <button class="year-nav" :disabled="year >= CURRENT_YEAR" @click="year++">›</button>
    </div>
    <div class="month-grid">
      <button
        v-for="(name, index) in MONTH_NAMES"
        :key="name"
        class="month-cell"
        :class="monthClass(yearMonth(year, index))"
        :disabled="yearMonth(year, index) > NOW"
        @click="pick(yearMonth(year, index))"
      >
        {{ name }}
      </button>
    </div>
    <div class="date-presets">
      <button
        v-for="preset in PRESETS"
        :key="preset.label"
        class="date-preset"
        @click="apply(...preset.range())"
      >
        {{ preset.label }}
      </button>
    </div>
    <div class="date-footer">
      <span class="date-hint">{{ hint }}</span>
      <button class="date-clear" @click="emit('change', null, null)">Clear</button>
    </div>
  </div>
</template>

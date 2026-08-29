<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";

/**
 * A date field that owns its own calendar. `<input type="date">` was the obvious
 * control, but everything it pops up is the browser's: an unstyleable calendar
 * and, on a plain text input, the list of values the browser remembers. Typing
 * still works — the input is the value, the calendar only writes into it.
 */
const props = defineProps<{ modelValue: string }>();
const emit = defineEmits<{ "update:modelValue": [string] }>();

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
/** How many years one page of the year grid shows — also the block it snaps to. */
const YEAR_PAGE = 12;
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const MONTHS_SHORT = MONTHS.map((name) => name.slice(0, 3));

interface Day {
  year: number;
  month: number;
  day: number;
}

/** A real YYYY-MM-DD, or null — "2026-02-31" parses as a date but is not one. */
function parse(value: string): Day | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return { year, month, day };
}

function format({ year, month, day }: Day): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const text = computed({
  get: () => props.modelValue,
  set: (value: string) => emit("update:modelValue", value),
});

const selected = computed(() => parse(props.modelValue));

const now = new Date();
const today: Day = { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };

const open = ref(false);
/** Which month the grid is showing — the selected one, or this one. */
const view = ref({ year: today.year, month: today.month });

/**
 * Days, or the two zoomed-out grids above them. Stepping a month at a time is
 * fine for recent writing and useless for a 2017 post, so the header title
 * zooms out — days to months to years — and picking zooms back in.
 */
const mode = ref<"days" | "months" | "years">("days");

/** Opening lands on the selected date, and typing a date walks the grid to it. */
watch([open, selected], () => {
  const target = selected.value;
  if (target) view.value = { year: target.year, month: target.month };
  mode.value = "days";
});

/** First year of the block the view sits in, so paging is stable while browsing. */
const yearStart = computed(() => Math.floor(view.value.year / YEAR_PAGE) * YEAR_PAGE);
const years = computed(() => Array.from({ length: YEAR_PAGE }, (_, i) => yearStart.value + i));

const viewLabel = computed(() => {
  if (mode.value === "years") return `${yearStart.value}–${yearStart.value + YEAR_PAGE - 1}`;
  if (mode.value === "months") return String(view.value.year);
  return `${MONTHS[view.value.month - 1]} ${view.value.year}`;
});

/** The header title zooms out one step per click, and wraps back round at the top. */
function zoomOut(): void {
  mode.value = mode.value === "days" ? "months" : mode.value === "months" ? "years" : "days";
}

/** The month's days, offset by however many blanks the first one sits behind. */
const cells = computed(() => {
  const { year, month } = view.value;
  const blanks = new Date(year, month - 1, 1).getDay();
  const length = new Date(year, month, 0).getDate();
  return [
    ...Array.from({ length: blanks }, () => null),
    ...Array.from({ length }, (_, i) => i + 1),
  ];
});

/** What the arrows step, in whatever the grid is currently showing. */
function shift(by: number): void {
  const { year, month } = view.value;
  if (mode.value === "days") {
    const date = new Date(year, month - 1 + by, 1);
    view.value = { year: date.getFullYear(), month: date.getMonth() + 1 };
    return;
  }
  view.value = { year: year + by * (mode.value === "years" ? YEAR_PAGE : 1), month };
}

function pickMonth(month: number): void {
  view.value = { ...view.value, month };
  mode.value = "days";
}

function pickYear(year: number): void {
  view.value = { ...view.value, year };
  mode.value = "months";
}

function isSame(day: number, other: Day | null): boolean {
  return (
    other !== null &&
    other.day === day &&
    other.month === view.value.month &&
    other.year === view.value.year
  );
}

function pick(day: number): void {
  emit("update:modelValue", format({ ...view.value, day }));
  open.value = false;
}

const root = ref<HTMLElement | null>(null);

/** Clicking anywhere else closes the calendar, including elsewhere in the form. */
function onPointerDown(event: PointerEvent): void {
  if (!root.value?.contains(event.target as Node)) open.value = false;
}

function onKeydown(event: KeyboardEvent): void {
  // Stopped, or the modal behind would take the same Escape and close too.
  if (event.key === "Escape") {
    event.stopPropagation();
    open.value = false;
  }
}

watch(open, (isOpen) => {
  if (isOpen) {
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeydown, true);
  } else {
    document.removeEventListener("pointerdown", onPointerDown);
    document.removeEventListener("keydown", onKeydown, true);
  }
});

onBeforeUnmount(() => {
  document.removeEventListener("pointerdown", onPointerDown);
  document.removeEventListener("keydown", onKeydown, true);
});
</script>

<template>
  <div ref="root" class="date-picker">
    <input
      v-model="text"
      type="text"
      inputmode="numeric"
      autocomplete="off"
      placeholder="YYYY-MM-DD"
      @focus="open = false"
    />
    <button
      class="date-toggle"
      :class="{ active: open }"
      :title="open ? 'Close calendar' : 'Pick from a calendar'"
      @click="open = !open"
    >
      <svg
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <rect x="3" y="5" width="18" height="16" rx="3"></rect>
        <path d="M3 10h18M8 3v3M16 3v3"></path>
      </svg>
    </button>

    <div v-if="open" class="date-popup">
      <div class="date-nav">
        <button
          :title="`Previous ${mode === 'years' ? 'years' : mode.slice(0, -1)}`"
          @click="shift(-1)"
        >
          ‹
        </button>
        <button class="date-title" title="Zoom out" @click="zoomOut">{{ viewLabel }}</button>
        <button :title="`Next ${mode === 'years' ? 'years' : mode.slice(0, -1)}`" @click="shift(1)">
          ›
        </button>
      </div>

      <div v-if="mode === 'days'" class="date-grid">
        <span v-for="label in WEEKDAYS" :key="label" class="date-weekday">{{ label }}</span>
        <template v-for="(day, index) in cells" :key="index">
          <span v-if="day === null" class="date-blank"></span>
          <button
            v-else
            class="date-day"
            :class="{ selected: isSame(day, selected), today: isSame(day, today) }"
            @click="pick(day)"
          >
            {{ day }}
          </button>
        </template>
      </div>

      <div v-else class="date-grid zoomed">
        <button
          v-for="(label, index) in mode === 'months' ? MONTHS_SHORT : years"
          :key="label"
          class="date-day"
          :class="{
            selected:
              mode === 'months'
                ? selected?.year === view.year && selected?.month === index + 1
                : selected?.year === years[index],
          }"
          @click="mode === 'months' ? pickMonth(index + 1) : pickYear(years[index])"
        >
          {{ label }}
        </button>
      </div>
    </div>
  </div>
</template>

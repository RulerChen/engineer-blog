<script setup lang="ts">
import { computed, ref } from "vue";
import type { FilterState } from "../lib/filter.js";
import { seriesLabel } from "../lib/series.js";
import { sourceName } from "../lib/sources.js";

const props = defineProps<{
  state: FilterState;
  companies: { id: string; count: number }[];
  tags: { tag: string; count: number }[];
}>();

const openMenu = ref<"company" | "tag" | "date" | null>(null);
const companySearch = ref("");
const tagSearch = ref("");

function toggleMenu(menu: "company" | "tag" | "date"): void {
  openMenu.value = openMenu.value === menu ? null : menu;
  companySearch.value = "";
  tagSearch.value = "";
}

function closeMenus(): void {
  openMenu.value = null;
}

function toggleCompany(id: string): void {
  const cur = props.state.companies;
  props.state.companies = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
}

function toggleTag(tag: string): void {
  const cur = props.state.tags;
  props.state.tags = cur.includes(tag) ? cur.filter((x) => x !== tag) : [...cur, tag];
}

const filteredCompanies = computed(() => {
  const q = companySearch.value.trim().toLowerCase();
  return props.companies.filter((c) => !q || sourceName(c.id).toLowerCase().includes(q));
});

const filteredTags = computed(() => {
  const q = tagSearch.value.trim().toLowerCase();
  return props.tags.filter((t) => !q || t.tag.toLowerCase().includes(q));
});

const companyLabel = computed(() =>
  props.state.companies.length ? `${props.state.companies.length} selected` : "All companies",
);
const tagLabel = computed(() =>
  props.state.tags.length ? `${props.state.tags.length} selected` : "All topics",
);

// ---- month-range date picker ----
const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const today = new Date();
const CURRENT_YEAR = today.getFullYear();
const MAX_YM = `${CURRENT_YEAR}-${String(today.getMonth() + 1).padStart(2, "0")}`;
const MIN_YEAR = CURRENT_YEAR - 6;

const pickerYear = ref(CURRENT_YEAR);

function ymOf(year: number, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}
function firstDayOf(ym: string): string {
  return `${ym}-01`;
}
function lastDayOf(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  const day = new Date(y, m, 0).getDate();
  return `${ym}-${String(day).padStart(2, "0")}`;
}
function shiftYm(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number);
  const t = y * 12 + (m - 1) + delta;
  const yy = Math.floor(t / 12);
  const mm = ((t % 12) + 12) % 12;
  return ymOf(yy, mm);
}
function monthLabel(ym: string): string {
  const [y, m] = ym.split("-");
  return `${MONTH_NAMES[Number(m) - 1]} ${y}`;
}

const fromMonth = computed(() => (props.state.dateFrom ? props.state.dateFrom.slice(0, 7) : ""));
const toMonth = computed(() => (props.state.dateTo ? props.state.dateTo.slice(0, 7) : ""));

function openDateMenu(): void {
  toggleMenu("date");
  pickerYear.value = fromMonth.value ? Number(fromMonth.value.slice(0, 4)) : CURRENT_YEAR;
}
function prevYear(): void {
  pickerYear.value = Math.max(MIN_YEAR, pickerYear.value - 1);
}
function nextYear(): void {
  pickerYear.value = Math.min(CURRENT_YEAR, pickerYear.value + 1);
}

function isFutureMonth(ym: string): boolean {
  return ym > MAX_YM;
}

function pickMonth(ym: string): void {
  if (isFutureMonth(ym)) return;
  if (!fromMonth.value || (fromMonth.value && toMonth.value)) {
    props.state.datePreset = "custom";
    props.state.dateFrom = firstDayOf(ym);
    props.state.dateTo = null;
  } else if (ym < fromMonth.value) {
    props.state.dateFrom = firstDayOf(ym);
  } else {
    props.state.dateTo = lastDayOf(ym);
  }
}

function monthCellClass(ym: string): Record<string, boolean> {
  const isEnd = ym === fromMonth.value || ym === toMonth.value;
  const inRange = !!(
    fromMonth.value &&
    toMonth.value &&
    ym > fromMonth.value &&
    ym < toMonth.value
  );
  return { end: isEnd, "in-range": inRange, disabled: isFutureMonth(ym) };
}

function applyLastMonths(monthsBack: number): void {
  props.state.datePreset = "custom";
  props.state.dateFrom = firstDayOf(shiftYm(MAX_YM, -monthsBack));
  props.state.dateTo = lastDayOf(MAX_YM);
  pickerYear.value = CURRENT_YEAR;
  closeMenus();
}
function applyThisYear(): void {
  props.state.datePreset = "custom";
  props.state.dateFrom = `${CURRENT_YEAR}-01-01`;
  props.state.dateTo = lastDayOf(MAX_YM);
  pickerYear.value = CURRENT_YEAR;
  closeMenus();
}
function applyAllTime(): void {
  props.state.datePreset = "all";
  props.state.dateFrom = null;
  props.state.dateTo = null;
  closeMenus();
}
function clearRange(): void {
  props.state.datePreset = "all";
  props.state.dateFrom = null;
  props.state.dateTo = null;
}

const rangeLabel = computed(() => {
  if (fromMonth.value && toMonth.value)
    return `${monthLabel(fromMonth.value)} – ${monthLabel(toMonth.value)}`;
  if (fromMonth.value) return `From ${monthLabel(fromMonth.value)}`;
  if (toMonth.value) return `Until ${monthLabel(toMonth.value)}`;
  return "Any time";
});
const dateHint = computed(() => {
  if (!fromMonth.value) return "Pick a start month";
  if (!toMonth.value) return "Now pick an end month";
  return rangeLabel.value;
});
const dateLabel = computed(() => {
  switch (props.state.datePreset) {
    case "custom":
      return rangeLabel.value;
    case "week":
      return "Last week";
    case "month":
      return "Last month";
    case "year":
      return "Last year";
    default:
      return "Any time";
  }
});

/** The one filter with no dropdown of its own — it is set by clicking a card's series row. */
const activeSeries = computed(() => (props.state.series ? seriesLabel(props.state.series) : ""));

const hasFilters = computed(
  () =>
    props.state.companies.length > 0 ||
    props.state.tags.length > 0 ||
    props.state.series !== null ||
    props.state.datePreset !== "all" ||
    props.state.query.trim() !== "",
);

function clearAll(): void {
  props.state.query = "";
  props.state.companies = [];
  props.state.tags = [];
  props.state.series = null;
  props.state.datePreset = "all";
  props.state.dateFrom = null;
  props.state.dateTo = null;
  closeMenus();
}
</script>

<template>
  <div class="filter-panel">
    <div v-if="openMenu" style="position: fixed; inset: 0; z-index: 50" @click="closeMenus"></div>

    <div class="filter-dropdown">
      <button class="filter-trigger" @click="toggleMenu('company')">
        <span>{{ companyLabel }}</span>
        <span class="chevron">▾</span>
      </button>
      <div v-if="openMenu === 'company'" class="filter-menu" style="z-index: 60">
        <input v-model="companySearch" type="text" placeholder="Find a company…" autofocus />
        <div class="filter-menu-list">
          <button
            v-for="c in filteredCompanies"
            :key="c.id"
            class="filter-option"
            @click="toggleCompany(c.id)"
          >
            <span class="checkbox" :class="{ checked: state.companies.includes(c.id) }">
              {{ state.companies.includes(c.id) ? "✓" : "" }}
            </span>
            <span class="option-name">{{ sourceName(c.id) }}</span>
            <span class="option-count">{{ c.count }}</span>
          </button>
          <div v-if="filteredCompanies.length === 0" class="filter-empty">No companies match</div>
        </div>
      </div>
    </div>

    <div class="filter-dropdown">
      <button class="filter-trigger" @click="toggleMenu('tag')">
        <span>{{ tagLabel }}</span>
        <span class="chevron">▾</span>
      </button>
      <div v-if="openMenu === 'tag'" class="filter-menu" style="z-index: 60">
        <input v-model="tagSearch" type="text" placeholder="Find a topic…" autofocus />
        <div class="filter-menu-list">
          <button
            v-for="t in filteredTags"
            :key="t.tag"
            class="filter-option"
            @click="toggleTag(t.tag)"
          >
            <span class="checkbox" :class="{ checked: state.tags.includes(t.tag) }">
              {{ state.tags.includes(t.tag) ? "✓" : "" }}
            </span>
            <span class="option-name">{{ t.tag }}</span>
            <span class="option-count">{{ t.count }}</span>
          </button>
          <div v-if="filteredTags.length === 0" class="filter-empty">No topics match</div>
        </div>
      </div>
    </div>

    <div class="filter-dropdown">
      <button class="filter-trigger" @click="openMenu === 'date' ? closeMenus() : openDateMenu()">
        <span>{{ dateLabel }}</span>
        <span class="chevron">▾</span>
      </button>
      <div v-if="openMenu === 'date'" class="filter-menu date-menu" style="z-index: 60">
        <div class="date-menu-year">
          <button class="year-nav" :disabled="pickerYear <= MIN_YEAR" @click="prevYear">‹</button>
          <span class="year-label heading-font">{{ pickerYear }}</span>
          <button class="year-nav" :disabled="pickerYear >= CURRENT_YEAR" @click="nextYear">
            ›
          </button>
        </div>
        <div class="month-grid">
          <button
            v-for="(name, mi) in MONTH_NAMES"
            :key="name"
            class="month-cell"
            :class="monthCellClass(ymOf(pickerYear, mi))"
            :disabled="isFutureMonth(ymOf(pickerYear, mi))"
            @click="pickMonth(ymOf(pickerYear, mi))"
          >
            {{ name }}
          </button>
        </div>
        <div class="date-presets">
          <button class="date-preset" @click="applyLastMonths(2)">Last 3 months</button>
          <button class="date-preset" @click="applyLastMonths(11)">Last 12 months</button>
          <button class="date-preset" @click="applyThisYear">This year</button>
          <button class="date-preset" @click="applyAllTime">All time</button>
        </div>
        <div class="date-footer">
          <span class="date-hint">{{ dateHint }}</span>
          <button class="date-clear" @click="clearRange">Clear</button>
        </div>
      </div>
    </div>

    <button
      v-if="activeSeries"
      class="series-active"
      title="Stop showing only this series"
      @click="state.series = null"
    >
      <span>{{ activeSeries }}</span>
      <span class="series-x">✕</span>
    </button>

    <button v-if="hasFilters" class="filter-clear-all" @click="clearAll">Clear all</button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import Icon from "../app/Icon.vue";
import { ICONS } from "../app/icons.js";
import CompanyMenu from "./CompanyMenu.vue";
import DateMenu from "./DateMenu.vue";
import FilterDropdown from "./FilterDropdown.vue";
import TopicMenu from "./TopicMenu.vue";
import { type Count, type FilterState, isFiltered, resetFilter } from "./filter.js";
import { rangeLabel } from "./months.js";

const props = defineProps<{
  /** The page's filter state, which this bar edits in place. */
  state: FilterState;
  companies: Count[];
  tags: Count[];
  /** Year of the oldest entry. */
  minYear: number;
  /** The active series' label, worked out by the page that holds the series index. */
  seriesLabel: string | null;
}>();

type Menu = "company" | "topic" | "date";
const openMenu = ref<Menu | null>(null);

function toggleMenu(menu: Menu): void {
  openMenu.value = openMenu.value === menu ? null : menu;
}

function closeMenu(): void {
  openMenu.value = null;
}

const companyLabel = computed(() => {
  const count = props.state.companies.length;
  return count ? `${count} selected` : "All companies";
});

/** The mode only changes what the selection means once there are two topics to combine. */
const topicLabel = computed(() => {
  const count = props.state.tags.length;
  if (count === 0) return "All topics";
  return count > 1 && props.state.tagMode === "all"
    ? `${count} selected · all`
    : `${count} selected`;
});

const DATE_PRESET_LABELS = {
  week: "Last week",
  month: "Last month",
  year: "Last year",
  all: "Any time",
};

const dateLabel = computed(() => {
  const { datePreset, dateFrom, dateTo } = props.state;
  return datePreset === "custom" ? rangeLabel(dateFrom, dateTo) : DATE_PRESET_LABELS[datePreset];
});

function setDates(from: string | null, to: string | null): void {
  props.state.datePreset = from || to ? "custom" : "all";
  props.state.dateFrom = from;
  props.state.dateTo = to;
}

function clearAll(): void {
  resetFilter(props.state);
  closeMenu();
}
</script>

<template>
  <div class="filter-bar" :class="{ 'menu-open': openMenu }">
    <div v-if="openMenu" class="filter-backdrop" @click="closeMenu"></div>

    <FilterDropdown
      :label="companyLabel"
      :open="openMenu === 'company'"
      @toggle="toggleMenu('company')"
    >
      <CompanyMenu v-if="openMenu === 'company'" v-model="state.companies" :companies="companies" />
    </FilterDropdown>

    <FilterDropdown :label="topicLabel" :open="openMenu === 'topic'" @toggle="toggleMenu('topic')">
      <TopicMenu
        v-if="openMenu === 'topic'"
        v-model="state.tags"
        v-model:mode="state.tagMode"
        :tags="tags"
      />
    </FilterDropdown>

    <FilterDropdown :label="dateLabel" :open="openMenu === 'date'" @toggle="toggleMenu('date')">
      <DateMenu
        v-if="openMenu === 'date'"
        :from="state.dateFrom"
        :to="state.dateTo"
        :min-year="minYear"
        @change="setDates"
        @close="closeMenu"
      />
    </FilterDropdown>

    <!-- The one filter with no menu: it is set from a card's series row. -->
    <button
      v-if="state.series"
      class="series-active"
      data-tip="Stop showing only this series"
      @click="state.series = null"
    >
      <Icon :paths="ICONS.series" :size="12" />
      <span class="series-active-label">{{ seriesLabel }}</span>
      <span class="series-x">✕</span>
    </button>

    <button v-if="isFiltered(state)" class="filter-clear-all" @click="clearAll">Clear all</button>

    <div class="filter-bar-end">
      <slot name="end" />
    </div>
  </div>
</template>

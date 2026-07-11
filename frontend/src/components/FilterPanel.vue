<script setup lang="ts">
import { computed, ref } from "vue";
import type { DatePreset, FilterState } from "../lib/filter.js";
import { sourceName } from "../lib/sources.js";

const props = defineProps<{
  state: FilterState;
  companies: { id: string; count: number }[];
  tags: { tag: string; count: number }[];
}>();

const presets: { value: DatePreset; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "week", label: "Last week" },
  { value: "month", label: "Last month" },
  { value: "year", label: "Last year" },
  { value: "custom", label: "Custom range" },
];

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
const dateLabel = computed(
  () => presets.find((p) => p.value === props.state.datePreset)?.label ?? "Any time",
);

const hasFilters = computed(
  () =>
    props.state.companies.length > 0 ||
    props.state.tags.length > 0 ||
    props.state.datePreset !== "all" ||
    props.state.query.trim() !== "",
);

function clearAll(): void {
  props.state.query = "";
  props.state.companies = [];
  props.state.tags = [];
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
      <button class="filter-trigger" @click="toggleMenu('date')">
        <span>{{ dateLabel }}</span>
        <span class="chevron">▾</span>
      </button>
      <div v-if="openMenu === 'date'" class="filter-menu date-menu" style="z-index: 60">
        <label v-for="preset in presets" :key="preset.value">
          <input v-model="state.datePreset" type="radio" :value="preset.value" />
          {{ preset.label }}
        </label>
        <div v-if="state.datePreset === 'custom'" class="date-custom">
          <input
            type="date"
            aria-label="From date"
            :value="state.dateFrom ?? ''"
            @change="state.dateFrom = ($event.target as HTMLInputElement).value || null"
          />
          <input
            type="date"
            aria-label="To date"
            :value="state.dateTo ?? ''"
            @change="state.dateTo = ($event.target as HTMLInputElement).value || null"
          />
        </div>
      </div>
    </div>

    <button v-if="hasFilters" class="filter-clear-all" @click="clearAll">Clear all</button>
  </div>
</template>

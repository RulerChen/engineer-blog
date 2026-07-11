<script setup lang="ts">
import type { DatePreset, FilterState } from "../lib/filter.js";
import { sourceName } from "../lib/sources.js";

defineProps<{
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
</script>

<template>
  <aside class="filter-panel">
    <h3>Company</h3>
    <label v-for="company in companies" :key="company.id">
      <input v-model="state.companies" type="checkbox" :value="company.id" />
      {{ sourceName(company.id) }}
      <span class="count">{{ company.count }}</span>
    </label>

    <h3>Tags</h3>
    <label v-for="tag in tags" :key="tag.tag">
      <input v-model="state.tags" type="checkbox" :value="tag.tag" />
      {{ tag.tag }}
      <span class="count">{{ tag.count }}</span>
    </label>

    <h3>Published</h3>
    <label v-for="preset in presets" :key="preset.value">
      <input v-model="state.datePreset" type="radio" :value="preset.value" />
      {{ preset.label }}
    </label>
    <template v-if="state.datePreset === 'custom'">
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
    </template>
  </aside>
</template>

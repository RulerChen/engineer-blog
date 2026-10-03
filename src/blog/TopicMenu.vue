<script setup lang="ts">
import { computed, ref } from "vue";
import { domainLabel, filterGroup } from "../shared/tags.js";
import FilterOption from "./FilterOption.vue";
import { type Count, type TagMode, toggled } from "./filter.js";
import { matches, parseQuery } from "./search.js";

const props = defineProps<{ tags: Count[] }>();
const selected = defineModel<string[]>({ required: true });
const mode = defineModel<TagMode>("mode", { required: true });

const MODES: { mode: TagMode; label: string; tip: string }[] = [
  { mode: "any", label: "Any", tip: "Show entries carrying a selected topic from each group" },
  { mode: "all", label: "All", tip: "Show only entries carrying every selected topic" },
];

const search = ref("");
/** Pinned to the top as the menu opens, so checking a row never moves it; unchecking drops it back into the list. */
const pinned = ref(new Set(selected.value));

function toggle(id: string): void {
  selected.value = toggled(selected.value, id);
  pinned.value.delete(id);
}

/** A domain's name, the id itself for everything else. */
function rowName(id: string): string {
  return domainLabel(id) ?? id;
}

function sectionName(key: string): string {
  if (key === "pinned") return "Selected";
  if (key === "domain") return "Domains";
  if (key === "cross-domain") return "Across domains";
  if (key === "technology") return "Technologies";
  return rowName(key);
}

/** In the order picks combine: pinned, domains, each domain's concepts, cross-domain, technologies. */
const sections = computed(() => {
  const query = parseQuery(search.value);
  const domains = props.tags.filter((tag) => filterGroup(tag.id) === "domain").map((tag) => tag.id);
  const keys = ["pinned", "domain", ...domains, "cross-domain", "technology"];
  const rows = new Map(keys.map((key) => [key, [] as Count[]]));
  for (const tag of props.tags) {
    const key = pinned.value.has(tag.id) ? "pinned" : filterGroup(tag.id);
    // A section's own name matches too, so "database" lists the database concepts.
    const named = matches(rowName(tag.id), query) || matches(tag.id, query);
    if (named || (key !== "pinned" && matches(sectionName(key), query))) rows.get(key)?.push(tag);
  }
  return [...rows]
    .filter(([, list]) => list.length > 0)
    .map(([key, list]) => ({ key, rows: list }));
});
</script>

<template>
  <div class="filter-menu">
    <input v-model="search" type="text" placeholder="Find a topic…" autofocus />
    <div class="filter-menu-mode">
      <span class="mode-label">Match</span>
      <div class="mode-toggle">
        <button
          v-for="option in MODES"
          :key="option.mode"
          class="mode-option"
          :class="{ active: mode === option.mode }"
          data-tip-pos="bottom"
          :data-tip="option.tip"
          @click="mode = option.mode"
        >
          {{ option.label }}
        </button>
      </div>
    </div>
    <div class="filter-menu-list">
      <template v-for="section in sections" :key="section.key">
        <div class="filter-menu-group">{{ sectionName(section.key) }}</div>
        <FilterOption
          v-for="tag in section.rows"
          :key="tag.id"
          :checked="selected.includes(tag.id)"
          :name="rowName(tag.id)"
          :count="tag.count"
          @click="toggle(tag.id)"
        />
      </template>
      <div v-if="sections.length === 0" class="filter-empty">No topics match</div>
    </div>
  </div>
</template>

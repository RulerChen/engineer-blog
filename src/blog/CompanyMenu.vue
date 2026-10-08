<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { sourceName } from "../shared/sources.js";
import FilterOption from "./FilterOption.vue";
import { type Count, toggled } from "./filter.js";
import { matches, parseQuery } from "./search.js";

const props = defineProps<{ companies: Count[] }>();
const selected = defineModel<string[]>({ required: true });

const search = ref("");
/** Pinned to the top as the menu opens, so checking a row never moves it; unchecking drops it back into the list. */
const pinned = ref(new Set(selected.value));

const input = ref<HTMLInputElement | null>(null);
// The autofocus attribute is ignored once the page has focus; a touch keyboard would cover the list, so fine pointers only.
onMounted(() => {
  if (matchMedia("(pointer: fine)").matches) input.value?.focus({ preventScroll: true });
});

function toggle(id: string): void {
  selected.value = toggled(selected.value, id);
  pinned.value.delete(id);
}

const rows = computed(() => {
  const query = parseQuery(search.value);
  const list = props.companies.filter((company) => matches(sourceName(company.id), query));
  const isPinned = (company: Count): boolean => pinned.value.has(company.id);
  return [...list.filter(isPinned), ...list.filter((company) => !isPinned(company))];
});

/** The divider goes after the pinned rows. */
const pinnedShown = computed(
  () => rows.value.filter((company) => pinned.value.has(company.id)).length,
);
</script>

<template>
  <div class="filter-menu">
    <input ref="input" v-model="search" type="text" placeholder="Find a company…" />
    <div class="filter-menu-list">
      <template v-for="(company, index) in rows" :key="company.id">
        <FilterOption
          :checked="selected.includes(company.id)"
          :name="sourceName(company.id)"
          :count="company.count"
          @click="toggle(company.id)"
        />
        <div
          v-if="index === pinnedShown - 1 && index < rows.length - 1"
          class="filter-menu-divider"
        ></div>
      </template>
      <div v-if="rows.length === 0" class="filter-empty">No companies match</div>
    </div>
  </div>
</template>

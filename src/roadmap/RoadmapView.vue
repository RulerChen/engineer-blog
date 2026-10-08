<script setup lang="ts">
import { computed } from "vue";
import type { Roadmap, RoadmapItem, RoadmapStep } from "../shared/roadmap.js";
import { topicLabel } from "../shared/topicMap.js";
import RoadmapEvolution from "./RoadmapEvolution.vue";
import RoadmapItemRow from "./RoadmapItem.vue";
import { useRoadmap } from "./data.js";
import { progressKey } from "./useProgress.js";

const props = defineProps<{
  roadmap: Roadmap;
  done: Readonly<Record<string, true>>;
  /** Topic ids that have a roadmap, so a relation can link rather than say "planned". */
  built: Set<string>;
}>();

const emit = defineEmits<{ toggle: [key: string]; open: [id: string] }>();

const keyOf = (item: RoadmapItem): string => progressKey(props.roadmap.id, item);
const isDone = (item: RoadmapItem): boolean => Boolean(props.done[keyOf(item)]);

/** Steps numbered straight through the parts, so step 7 is step 7 wherever it sits. */
const numbered = computed(() => {
  let n = 0;
  return props.roadmap.parts.map((part) => ({
    part,
    steps: part.steps.map((step) => ({ step, n: ++n })),
  }));
});

/** Main-line steps ticked off, the same ones whose numbers fill in. */
const progress = computed(() => {
  const steps = numbered.value.flatMap((part) => part.steps);
  return { read: steps.filter(({ step }) => isDone(step.main)).length, total: steps.length };
});

const relations = computed(() =>
  [
    { label: "Read first", ids: props.roadmap.before },
    { label: "Next", ids: props.roadmap.next },
  ].filter((row) => row.ids.length),
);

/** The side box's groups that have items, in the order they are read in. */
function sideGroups(step: RoadmapStep): { name: string; items: RoadmapItem[] }[] {
  return [
    { name: "Background", items: step.background },
    { name: "Alternative", items: step.alternative },
    { name: "Further reading", items: step.further },
  ].filter((group) => group.items.length);
}
</script>

<template>
  <article class="rm-view">
    <header class="rm-top">
      <h2 class="heading-font">{{ roadmap.title }}</h2>
      <p class="rm-progress">{{ progress.read }} of {{ progress.total }} steps read</p>
      <div v-for="row in relations" :key="row.label" class="rm-rel-row">
        <b>{{ row.label }}</b>
        <template v-for="id in row.ids" :key="id">
          <button
            v-if="built.has(id)"
            class="rm-rel built"
            @click="emit('open', id)"
            @pointerenter="useRoadmap(id)"
            @focus="useRoadmap(id)"
          >
            {{ topicLabel(id) }}
          </button>
          <span v-else class="rm-rel">{{ topicLabel(id) }}<i>planned</i></span>
        </template>
      </div>
      <RoadmapEvolution v-if="roadmap.evolution" :evolution="roadmap.evolution" />
    </header>

    <div class="rm-parts">
      <section v-for="{ part, steps } in numbered" :key="part.name" class="rm-part">
        <div class="rm-part-head">
          <h3>{{ part.name }}</h3>
        </div>
        <div
          v-for="{ step, n } in steps"
          :key="n"
          class="rm-row"
          :class="{ done: isDone(step.main) }"
        >
          <div class="rm-spine">
            <span class="rm-num">{{ n }}</span>
          </div>
          <RoadmapItemRow
            class="rm-main"
            :item="step.main"
            main
            :done="isDone(step.main)"
            @toggle="emit('toggle', keyOf(step.main))"
          />
          <div v-if="sideGroups(step).length" class="rm-side">
            <template v-for="group in sideGroups(step)" :key="group.name">
              <div class="rm-side-head">{{ group.name }}</div>
              <RoadmapItemRow
                v-for="item in group.items"
                :key="keyOf(item)"
                :item="item"
                :done="isDone(item)"
                @toggle="emit('toggle', keyOf(item))"
              />
            </template>
          </div>
        </div>
      </section>
    </div>
  </article>
</template>

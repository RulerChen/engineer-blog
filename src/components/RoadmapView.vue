<script setup lang="ts">
import { computed } from "vue";
import RoadmapItemRow from "./RoadmapItem.vue";
import type { Roadmap, RoadmapItem } from "../lib/roadmap.js";
import { topicLabel } from "../lib/topicMap.js";

const props = defineProps<{
  roadmap: Roadmap;
  done: Record<string, true>;
  /** Topic ids that have a roadmap, so a relation can link rather than say "planned". */
  built: Set<string>;
}>();

const emit = defineEmits<{ toggle: [key: string]; open: [id: string] }>();

const keyOf = (item: RoadmapItem): string => `${props.roadmap.id}|${item.url}|${item.scope ?? ""}`;
const isDone = (item: RoadmapItem): boolean => Boolean(props.done[keyOf(item)]);

/** Steps numbered straight through the parts, so step 7 is step 7 wherever it sits. */
const numbered = computed(() => {
  let n = 0;
  return props.roadmap.parts.map((part) => ({
    part,
    steps: part.steps.map((step) => ({ step, n: ++n })),
  }));
});

const relations = computed(() =>
  [
    { label: "Read first", ids: props.roadmap.before },
    { label: "Next", ids: props.roadmap.next },
  ].filter((row) => row.ids.length),
);
</script>

<template>
  <article class="rm-view">
    <header class="rm-top">
      <h2 class="heading-font">{{ roadmap.title }}</h2>
      <p class="rm-blurb">{{ roadmap.blurb }}</p>
      <div v-for="row in relations" :key="row.label" class="rm-rel-row">
        <b>{{ row.label }}</b>
        <template v-for="id in row.ids" :key="id">
          <button v-if="built.has(id)" class="rm-rel built" @click="emit('open', id)">
            {{ topicLabel(id) }}
          </button>
          <span v-else class="rm-rel">{{ topicLabel(id) }}<i>planned</i></span>
        </template>
      </div>
    </header>

    <div class="rm-parts">
      <section v-for="entry in numbered" :key="entry.part.name" class="rm-part">
        <div class="rm-part-head">
          <h3>{{ entry.part.name }}</h3>
          <p class="heading-font">{{ entry.part.goal }}</p>
        </div>
        <div
          v-for="{ step, n } in entry.steps"
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
          <div
            v-if="step.alternative.length || step.background.length || step.further.length"
            class="rm-side"
          >
            <template
              v-for="group in [
                { name: 'Background', items: step.background },
                { name: 'Alternative', items: step.alternative },
                { name: 'Further reading', items: step.further },
              ]"
              :key="group.name"
            >
              <template v-if="group.items.length">
                <div class="rm-side-head">{{ group.name }}</div>
                <RoadmapItemRow
                  v-for="item in group.items"
                  :key="keyOf(item)"
                  :item="item"
                  :done="isDone(item)"
                  @toggle="emit('toggle', keyOf(item))"
                />
              </template>
            </template>
          </div>
        </div>
      </section>
    </div>
  </article>
</template>

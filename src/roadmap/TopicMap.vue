<script setup lang="ts">
import { computed } from "vue";
import { onActivateKey } from "../app/a11y.js";
import {
  COLUMN_X,
  MAP_HEIGHT,
  MAP_WIDTH,
  NODE_HEIGHT,
  NODE_WIDTH,
  TOPIC_EDGES,
  TOPIC_NODES,
  edgePath,
  topicLabel,
} from "../shared/topicMap.js";
import { useRoadmap } from "./data.js";

const props = defineProps<{
  /** Topic ids that have a roadmap. */
  built: Set<string>;
}>();

const emit = defineEmits<{ open: [id: string] }>();

const label = `Topic map. ${TOPIC_EDGES.map((edge) => `${topicLabel(edge.from)} leads to ${topicLabel(edge.to)}`).join(". ")}.`;

/** Baselines that centre one or two lines in the box. */
function lineY(top: number, lines: number, index: number): number {
  return top + NODE_HEIGHT / 2 + 5.5 + (index - (lines - 1) / 2) * 18;
}

const nodes = computed(() =>
  TOPIC_NODES.map((node) => ({
    ...node,
    x: COLUMN_X[node.col],
    lines: node.label.split("\n"),
    built: props.built.has(node.id),
  })),
);

/** The map for narrow screens: column by column, top to bottom, each topic naming what to read first. */
const columns = computed(() =>
  COLUMN_X.map((_, col) =>
    nodes.value
      .filter((node) => node.col === col)
      .toSorted((a, b) => a.y - b.y)
      .map((node) => ({
        ...node,
        after: TOPIC_EDGES.filter((edge) => edge.to === node.id).map((edge) =>
          topicLabel(edge.from),
        ),
      })),
  ),
);
</script>

<template>
  <figure class="topic-map">
    <div class="topic-map-scroll">
      <svg :viewBox="`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`" role="img" :aria-label="label">
        <defs>
          <marker
            id="topic-arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L10,5 L0,10 z" fill="currentColor"></path>
          </marker>
        </defs>
        <path
          v-for="edge in TOPIC_EDGES"
          :key="`${edge.from}-${edge.to}`"
          class="tm-edge"
          :d="edgePath(edge)"
          marker-end="url(#topic-arrow)"
        ></path>
        <g
          v-for="node in nodes"
          :key="node.id"
          class="tm-node"
          :class="node.built ? 'built' : 'planned'"
          :tabindex="node.built ? 0 : undefined"
          :role="node.built ? 'button' : undefined"
          :aria-label="node.built ? `Open the ${topicLabel(node.id)} roadmap` : undefined"
          @click="node.built && emit('open', node.id)"
          @keydown="node.built && onActivateKey($event, () => emit('open', node.id))"
          @pointerenter="node.built && useRoadmap(node.id)"
          @focus="node.built && useRoadmap(node.id)"
        >
          <rect :x="node.x" :y="node.y" :width="NODE_WIDTH" :height="NODE_HEIGHT" rx="10"></rect>
          <text class="tm-title" :x="node.x + 14">
            <tspan
              v-for="(line, index) in node.lines"
              :key="line"
              :x="node.x + 14"
              :y="lineY(node.y, node.lines.length, index)"
            >
              {{ line }}
            </tspan>
          </text>
        </g>
      </svg>
    </div>
    <div class="topic-list">
      <ul v-for="(column, col) in columns" :key="col" class="tl-column">
        <li v-for="node in column" :key="node.id">
          <component
            :is="node.built ? 'button' : 'div'"
            class="tl-topic"
            :class="{ built: node.built }"
            @click="node.built && emit('open', node.id)"
            @pointerenter="node.built && useRoadmap(node.id)"
            @focus="node.built && useRoadmap(node.id)"
          >
            {{ topicLabel(node.id) }}
            <span v-if="node.after.length" class="tl-after"
              >Read first: {{ node.after.join(", ") }}</span
            >
          </component>
        </li>
      </ul>
    </div>
  </figure>
</template>

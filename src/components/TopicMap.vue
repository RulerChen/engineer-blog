<script setup lang="ts">
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
} from "../lib/topicMap.js";

const props = defineProps<{
  /** Topic ids that have a roadmap. */
  built: Set<string>;
}>();

const emit = defineEmits<{ open: [id: string] }>();

const label = `Topic map. ${TOPIC_EDGES.map((edge) => `${topicLabel(edge.from)} leads to ${topicLabel(edge.to)}`).join(". ")}.`;

/** Baselines that centre one or two lines in the box. */
function lineY(top: number, name: string, index: number): number {
  const lines = name.split("\n").length;
  return top + NODE_HEIGHT / 2 + 5.5 + (index - (lines - 1) / 2) * 18;
}

function onKey(event: KeyboardEvent, id: string): void {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  emit("open", id);
}
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
          v-for="node in TOPIC_NODES"
          :key="node.id"
          class="tm-node"
          :class="props.built.has(node.id) ? 'built' : 'planned'"
          :tabindex="props.built.has(node.id) ? 0 : undefined"
          :role="props.built.has(node.id) ? 'button' : undefined"
          :aria-label="
            props.built.has(node.id) ? `Open the ${topicLabel(node.id)} roadmap` : undefined
          "
          @click="props.built.has(node.id) && emit('open', node.id)"
          @keydown="props.built.has(node.id) && onKey($event, node.id)"
        >
          <rect
            :x="COLUMN_X[node.col]"
            :y="node.y"
            :width="NODE_WIDTH"
            :height="NODE_HEIGHT"
            rx="10"
          ></rect>
          <text class="tm-title" :x="COLUMN_X[node.col] + 14">
            <tspan
              v-for="(line, index) in node.label.split('\n')"
              :key="line"
              :x="COLUMN_X[node.col] + 14"
              :y="lineY(node.y, node.label, index)"
            >
              {{ line }}
            </tspan>
          </text>
        </g>
      </svg>
    </div>
  </figure>
</template>

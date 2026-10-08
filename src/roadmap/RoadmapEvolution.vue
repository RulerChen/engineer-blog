<script setup lang="ts">
import { computed, ref } from "vue";
import { onActivateKey } from "../app/a11y.js";
import type { Evolution } from "../shared/roadmap.js";
import { NODE_HEIGHT, NODE_WIDTH, layoutEvolution } from "./evolutionLayout.js";

const props = defineProps<{ evolution: Evolution }>();

const layout = computed(() => layoutEvolution(props.evolution));

/** The clicked box or era, whose story the card below tells; hovering only lights arrows. */
const selected = ref<string | null>(null);
const selectedEra = ref<number | null>(null);
const hovered = ref<string | null>(null);
const focus = computed(() => hovered.value ?? selected.value);

const byId = computed(() => new Map(props.evolution.nodes.map((node) => [node.id, node])));
const card = computed(() => {
  const node = selected.value ? byId.value.get(selected.value) : undefined;
  return (
    node && {
      ...node,
      sources: node.from.map((link) => ({ ...link, node: byId.value.get(link.id)! })),
    }
  );
});
const eraCard = computed(() =>
  selectedEra.value === null
    ? undefined
    : { ...props.evolution.eras[selectedEra.value], ...layout.value.eras[selectedEra.value] },
);

const laneColor = (lane: number): string => `var(--lane-${lane + 1})`;

function select(id: string): void {
  selected.value = selected.value === id ? null : id;
  selectedEra.value = null;
}

function selectEra(index: number): void {
  selectedEra.value = selectedEra.value === index ? null : index;
  selected.value = null;
}
</script>

<template>
  <details class="rm-evo">
    <summary>
      <span class="rm-evo-label">Evolution</span>
      <span class="chevron" aria-hidden="true">▾</span>
    </summary>
    <!-- One box for the part that folds, so its edge and spacing fold with it. -->
    <div class="rm-evo-body">
      <ul class="rm-evo-legend">
        <li v-for="(lane, index) in evolution.lanes" :key="lane">
          <i :style="{ background: laneColor(index) }"></i>{{ lane }}
        </li>
      </ul>
      <div class="rm-evo-scroll">
        <svg
          :viewBox="`0 0 ${layout.width} ${layout.height}`"
          :style="{
            maxWidth: `${layout.width}px`,
            minWidth: `${Math.round(layout.width * 0.72)}px`,
          }"
        >
          <defs>
            <marker
              v-for="id in ['evo-arrow', 'evo-arrow-lit']"
              :id="id"
              :key="id"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerUnits="userSpaceOnUse"
              markerWidth="12"
              markerHeight="12"
              orient="auto-start-reverse"
            >
              <path d="M0,0 L10,5 L0,10 z" :class="id"></path>
            </marker>
          </defs>
          <g
            v-for="(era, index) in layout.eras"
            :key="era.x"
            class="evo-era"
            :class="{ active: selectedEra === index }"
            role="button"
            tabindex="0"
            :aria-pressed="selectedEra === index"
            :aria-label="`${evolution.eras[index].name}, ${era.span}`"
            @click="selectEra(index)"
            @keydown="onActivateKey($event, () => selectEra(index))"
          >
            <rect
              v-if="index % 2 === 0"
              class="evo-era-band"
              :x="era.x"
              y="0"
              :width="era.width"
              :height="layout.height"
              rx="10"
            ></rect>
            <rect
              class="evo-era-hit"
              :x="era.x"
              y="0"
              :width="era.width"
              :height="layout.head"
              rx="10"
            ></rect>
            <text class="evo-era-name">
              <tspan
                v-for="(line, row) in era.nameLines"
                :key="row"
                :x="era.x + 12"
                :y="22 + row * 17"
              >
                {{ line }}
              </tspan>
            </text>
            <text class="evo-era-span" :x="era.x + 12" :y="era.spanY">{{ era.span }}</text>
            <text class="evo-era-text">
              <tspan
                v-for="(line, row) in era.textLines"
                :key="row"
                :x="era.x + 12"
                :y="era.textY + row * 14"
              >
                {{ line }}
              </tspan>
            </text>
          </g>
          <line
            v-for="y in layout.dividers"
            :key="y"
            class="evo-lane-line"
            x1="0"
            :x2="layout.width"
            :y1="y"
            :y2="y"
          ></line>
          <path
            v-for="edge in layout.edges"
            :key="`${edge.from}-${edge.to}`"
            class="evo-edge"
            :class="{ lit: focus === edge.from || focus === edge.to }"
            :d="edge.d"
            :marker-end="`url(#${focus === edge.from || focus === edge.to ? 'evo-arrow-lit' : 'evo-arrow'})`"
          ></path>
          <g
            v-for="node in layout.nodes"
            :key="node.id"
            class="evo-node"
            :class="{ active: selected === node.id }"
            role="button"
            tabindex="0"
            :aria-pressed="selected === node.id"
            :aria-label="`${node.label}, ${node.year}`"
            @click="select(node.id)"
            @keydown="onActivateKey($event, () => select(node.id))"
            @pointerenter="hovered = node.id"
            @pointerleave="hovered = null"
          >
            <rect :x="node.x" :y="node.y" :width="NODE_WIDTH" :height="NODE_HEIGHT" rx="9"></rect>
            <rect
              class="evo-node-lane"
              :x="node.x + 5"
              :y="node.y + 8"
              width="4"
              :height="NODE_HEIGHT - 16"
              rx="2"
              :style="{ fill: laneColor(node.lane) }"
            ></rect>
            <text class="evo-node-label">
              <tspan
                v-for="(line, row) in node.lines"
                :key="row"
                :x="node.x + NODE_WIDTH / 2 + 3"
                :y="node.y + (node.lines.length > 1 ? 18 : 23) + row * 13"
              >
                {{ line }}
              </tspan>
            </text>
            <text
              class="evo-node-year"
              :x="node.x + NODE_WIDTH / 2 + 3"
              :y="node.y + (node.lines.length > 1 ? 42 : 38)"
            >
              {{ node.year }}
            </text>
          </g>
        </svg>
      </div>
      <div class="rm-evo-card" aria-live="polite">
        <template v-if="card">
          <div class="rm-evo-card-head">
            <b class="heading-font">{{ card.label }}</b>
            <span class="rm-evo-card-year">{{ card.year }}</span>
            <span class="rm-evo-card-lane"
              ><i :style="{ background: laneColor(card.lane) }"></i
              >{{ evolution.lanes[card.lane] }}</span
            >
          </div>
          <dl>
            <template v-if="card.problem">
              <dt>Problem</dt>
              <dd>{{ card.problem }}</dd>
            </template>
            <template v-for="link in card.sources" :key="link.id">
              <dt>
                <span class="rm-evo-source"
                  ><i :style="{ background: laneColor(link.node.lane) }"></i
                  >{{ link.node.label }}</span
                >
              </dt>
              <dd>{{ link.why }}</dd>
            </template>
            <dt>Idea</dt>
            <dd>{{ card.idea }}</dd>
            <dt>Impact</dt>
            <dd>{{ card.impact }}</dd>
          </dl>
        </template>
        <template v-else-if="eraCard">
          <div class="rm-evo-card-head">
            <b class="heading-font">{{ eraCard.name }}</b>
            <span class="rm-evo-card-year">{{ eraCard.span }}</span>
          </div>
          <p class="rm-evo-background">{{ eraCard.background }}</p>
        </template>
        <p v-else class="rm-evo-hint">
          Click an era for its background, or a box for what it faced, what it did and what it
          changed.
        </p>
      </div>
    </div>
  </details>
</template>

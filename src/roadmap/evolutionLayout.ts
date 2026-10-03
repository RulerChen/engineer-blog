import type { Evolution, EvolutionNode } from "../shared/roadmap.js";

const ROW_HEIGHT = 66;
export const NODE_WIDTH = 100;
export const NODE_HEIGHT = 48;
/** The width the map aims to fill; slots stretch or shrink toward it within SLOT_MIN and SLOT_MAX. */
const TARGET_WIDTH = 1120;
const SLOT_MIN = 122;
const SLOT_MAX = 190;

export interface PlacedNode extends EvolutionNode {
  /** The label broken into the one or two lines the box shows. */
  lines: string[];
  x: number;
  y: number;
}

export interface PlacedEra {
  /** Name and text broken into lines that fit the era's column. */
  nameLines: string[];
  textLines: string[];
  span: string;
  /** Baselines of the span and of the first text line. */
  spanY: number;
  textY: number;
  x: number;
  width: number;
}

export interface EvolutionLayout {
  width: number;
  height: number;
  /** Height of the era headings above the first lane. */
  head: number;
  eras: PlacedEra[];
  /** Heights of the dashed lines between lanes. */
  dividers: number[];
  nodes: PlacedNode[];
  edges: { from: string; to: string; d: string }[];
}

/** Greedy word wrap for SVG text, which does not wrap on its own. */
function wrap(text: string, chars: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    if (line && line.length + word.length + 1 > chars) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Right edge to left edge; across lanes it runs along the source's lane and turns in the gap before the target. */
function edgePath(a: PlacedNode, b: PlacedNode, gap: number): string {
  const x1 = a.x + NODE_WIDTH;
  const y1 = a.y + NODE_HEIGHT / 2;
  const x2 = b.x - 3;
  const y2 = b.y + NODE_HEIGHT / 2;
  if (y1 === y2) return `M${x1},${y1} H${x2}`;
  const turn = b.x - gap / 2;
  const r = 5;
  const dy = y2 > y1 ? r : -r;
  return `M${x1},${y1} H${turn - r} Q${turn},${y1} ${turn},${y1 + dy} V${y2 - dy} Q${turn},${y2} ${turn + r},${y2} H${x2}`;
}

/** Column per era, row per lane; a box sits right of its lane's previous box and of any same-era source. */
export function layoutEvolution(evolution: Evolution): EvolutionLayout {
  const eraOf = new Map(evolution.nodes.map((node) => [node.id, node.era]));
  const byInput = new Map(evolution.nodes.map((node) => [node.id, node]));
  const slotOf = new Map<string, number>();
  const slots = evolution.eras.map((_, era) => {
    const next = new Map<number, number>();
    const place = (node: EvolutionNode): number => {
      const placed = slotOf.get(node.id);
      if (placed !== undefined) return placed;
      let slot = 0;
      for (const { id } of node.from) {
        if (eraOf.get(id) === era) slot = Math.max(slot, place(byInput.get(id)!) + 1);
      }
      slot = Math.max(slot, next.get(node.lane) ?? 0);
      slotOf.set(node.id, slot);
      next.set(node.lane, slot + 1);
      return slot;
    };
    evolution.nodes
      .map((node, order) => ({ node, order }))
      .filter(({ node }) => node.era === era)
      .toSorted((a, b) => Number(a.node.year) - Number(b.node.year) || a.order - b.order)
      .forEach(({ node }) => place(node));
    return Math.max(1, ...next.values());
  });
  const total = slots.reduce((sum, count) => sum + count, 0);
  const slot = Math.min(SLOT_MAX, Math.max(SLOT_MIN, TARGET_WIDTH / total));

  let x = 0;
  const eras = evolution.eras.map((era, index) => {
    const years = evolution.nodes.filter((node) => node.era === index).map((node) => node.year);
    const first = years.reduce((a, b) => (a < b ? a : b));
    const last = years.reduce((a, b) => (a > b ? a : b));
    const width = slots[index] * slot;
    const nameLines = wrap(era.name, Math.floor((width - 20) / 7.8));
    const spanY = 22 + (nameLines.length - 1) * 17 + 16;
    const placed: PlacedEra = {
      nameLines,
      textLines: wrap(era.text, Math.floor((width - 20) / 6.2)),
      span: first === last ? first : `${first}–${last}`,
      spanY,
      textY: spanY + 17,
      x,
      width,
    };
    x += width;
    return placed;
  });
  const head = Math.max(...eras.map((era) => era.textY + (era.textLines.length - 1) * 14)) + 16;

  const nodes: PlacedNode[] = evolution.nodes.map((node) => ({
    ...node,
    lines:
      node.label.length > 12 ? wrap(node.label, Math.ceil(node.label.length / 2)) : [node.label],
    x: eras[node.era].x + (slotOf.get(node.id) ?? 0) * slot + (slot - NODE_WIDTH) / 2,
    y: head + node.lane * ROW_HEIGHT + (ROW_HEIGHT - NODE_HEIGHT) / 2,
  }));
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const edges = nodes.flatMap((node) =>
    node.from.map(({ id }) => ({
      from: id,
      to: node.id,
      d: edgePath(byId.get(id)!, node, slot - NODE_WIDTH),
    })),
  );

  return {
    width: x,
    height: head + evolution.lanes.length * ROW_HEIGHT + 6,
    head,
    eras,
    dividers: evolution.lanes.slice(1).map((_, index) => head + (index + 1) * ROW_HEIGHT),
    nodes,
    edges,
  };
}

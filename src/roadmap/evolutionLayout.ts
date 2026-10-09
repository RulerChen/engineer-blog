import type { Evolution, EvolutionNode } from "../shared/roadmap.js";

const ROW_HEIGHT = 74;
/** Wide enough for the widest unbreakable label word, "Log-structured", with room either side. */
export const NODE_WIDTH = 114;
export const NODE_HEIGHT = 58;
/** Label text runs from 6 past the lane bar (x 5 to 9) to 6 short of the right edge. */
const TEXT_LEFT = 15;
const TEXT_RIGHT = NODE_WIDTH - 6;
/** Measured on the 12.5px label font: its ascent, then baseline steps between label lines and on to the year. */
const LABEL_ASCENT = 9;
const LABEL_LINE = 15;
const YEAR_STEP = 14;
/** Baseline steps between lines of an era's name and of its text. */
const ERA_NAME_LINE = 18;
const ERA_TEXT_LINE = 16;
/** The width the map aims to fill; slots stretch or shrink toward it within SLOT_MIN and SLOT_MAX. */
const TARGET_WIDTH = 1120;
/** Keeps 22 between boxes, the least that fits a turn and an arrowhead. */
const SLOT_MIN = NODE_WIDTH + 22;
const SLOT_MAX = 190;

export interface PlacedNode extends EvolutionNode {
  /** The label broken into the one or two lines the box shows. */
  lines: string[];
  x: number;
  y: number;
  /** Centre of the text, and the baselines of each label line and of the year, all centred in the box together. */
  textX: number;
  lineY: number[];
  yearY: number;
}

export interface PlacedEra {
  /** Name and text broken into lines that fit the era's column, each with its baseline. */
  nameLines: string[];
  nameY: number[];
  textLines: string[];
  textY: number[];
  span: string;
  spanY: number;
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

/** One line if it fits, else the two-line split whose longer line is shortest; a space beats a hyphen or slash whenever one fits. */
function labelLines(label: string, measure: (text: string) => number): string[] {
  const room = TEXT_RIGHT - TEXT_LEFT;
  if (measure(label) <= room) return [label];
  const splits = [...label].flatMap((char, index) => {
    if (!" -/".includes(char) || index === label.length - 1) return [];
    const lines = [label.slice(0, index + 1).trim(), label.slice(index + 1).trim()];
    return [{ lines, atSpace: char === " ", width: Math.max(...lines.map(measure)) }];
  });
  const fits = splits.filter((split) => split.width <= room);
  const spaced = fits.filter((split) => split.atSpace);
  const pool = spaced.length ? spaced : fits.length ? fits : splits;
  return pool.reduce((best, split) => (split.width < best.width ? split : best), {
    lines: [label],
    width: Infinity,
  }).lines;
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
export function layoutEvolution(
  evolution: Evolution,
  /** Width of a label in the node label font, which wrapping goes by. */
  measure: (text: string) => number,
): EvolutionLayout {
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
    const textLines = wrap(era.text, Math.floor((width - 20) / 6.2));
    const nameY = nameLines.map((_, row) => 22 + row * ERA_NAME_LINE);
    const spanY = nameY[nameY.length - 1] + 16;
    const placed: PlacedEra = {
      nameLines,
      nameY,
      textLines,
      textY: textLines.map((_, row) => spanY + 17 + row * ERA_TEXT_LINE),
      span: first === last ? first : `${first}–${last}`,
      spanY,
      x,
      width,
    };
    x += width;
    return placed;
  });
  const head = Math.max(...eras.map((era) => era.textY[era.textY.length - 1])) + 16;

  const nodes: PlacedNode[] = evolution.nodes.map((node) => {
    const lines = labelLines(node.label, measure);
    const left = eras[node.era].x + (slotOf.get(node.id) ?? 0) * slot + (slot - NODE_WIDTH) / 2;
    const top = head + node.lane * ROW_HEIGHT + (ROW_HEIGHT - NODE_HEIGHT) / 2;
    // From the top of the first line's capitals down to the year's baseline; digits have no descent.
    const block = LABEL_ASCENT + (lines.length - 1) * LABEL_LINE + YEAR_STEP;
    const first = top + (NODE_HEIGHT - block) / 2 + LABEL_ASCENT;
    return {
      ...node,
      lines,
      x: left,
      y: top,
      textX: left + (TEXT_LEFT + TEXT_RIGHT) / 2,
      lineY: lines.map((_, row) => first + row * LABEL_LINE),
      yearY: first + (lines.length - 1) * LABEL_LINE + YEAR_STEP,
    };
  });
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

/** A field on the topic map; column 0 is the CS basics everything else grows from. */
export interface TopicNode {
  id: string;
  /** A "\n" marks where the map breaks a long name onto two lines. */
  label: string;
  col: number;
  /** Top edge in map units. */
  y: number;
}

/** An arrow meaning "read this first", landing `enter` units below the target's top. */
export interface TopicEdge {
  from: string;
  to: string;
  enter: number;
}

export const NODE_WIDTH = 172;
export const NODE_HEIGHT = 52;
export const COLUMN_X = [12, 256, 500, 744, 988];
export const MAP_WIDTH = 1172;
export const MAP_HEIGHT = 776;

// Each box shares a row only with a real source; the one crossing is OS to Security over Networking to DS.
export const TOPIC_NODES: TopicNode[] = [
  { id: "discrete-math", label: "Discrete math", col: 0, y: 28 },
  { id: "operating-systems", label: "Operating systems", col: 0, y: 180 },
  { id: "networking", label: "Networking", col: 0, y: 332 },
  { id: "dsa", label: "Data structures\n& algorithms", col: 0, y: 408 },
  { id: "linear-algebra", label: "Linear algebra", col: 0, y: 522 },
  { id: "probability", label: "Probability", col: 0, y: 598 },
  { id: "computer-architecture", label: "Computer\narchitecture", col: 1, y: 104 },
  { id: "distributed-systems", label: "Distributed systems", col: 1, y: 256 },
  { id: "database-systems", label: "Database systems", col: 1, y: 408 },
  { id: "machine-learning", label: "Machine learning", col: 1, y: 560 },
  { id: "compilers", label: "Compilers\n& languages", col: 2, y: 28 },
  { id: "security", label: "Security", col: 1, y: 332 },
  { id: "data-systems", label: "Data systems", col: 2, y: 332 },
  { id: "deep-learning", label: "Deep learning", col: 2, y: 560 },
  { id: "reinforcement-learning", label: "Reinforcement\nlearning", col: 2, y: 712 },
  { id: "ml-systems", label: "ML systems", col: 3, y: 484 },
  { id: "computer-vision", label: "Computer vision", col: 3, y: 560 },
  { id: "nlp", label: "Natural language\nprocessing", col: 3, y: 636 },
  { id: "large-language-models", label: "Large language\nmodels", col: 4, y: 674 },
];

export const TOPIC_EDGES: TopicEdge[] = [
  { from: "discrete-math", to: "compilers", enter: 26 },
  { from: "operating-systems", to: "computer-architecture", enter: 26 },
  { from: "operating-systems", to: "distributed-systems", enter: 14 },
  { from: "networking", to: "distributed-systems", enter: 38 },
  { from: "operating-systems", to: "security", enter: 14 },
  { from: "networking", to: "security", enter: 26 },
  { from: "dsa", to: "database-systems", enter: 26 },
  { from: "linear-algebra", to: "machine-learning", enter: 14 },
  { from: "probability", to: "machine-learning", enter: 38 },
  { from: "computer-architecture", to: "compilers", enter: 38 },
  { from: "distributed-systems", to: "data-systems", enter: 14 },
  { from: "distributed-systems", to: "ml-systems", enter: 14 },
  { from: "database-systems", to: "data-systems", enter: 38 },
  { from: "machine-learning", to: "deep-learning", enter: 26 },
  { from: "machine-learning", to: "reinforcement-learning", enter: 26 },
  { from: "deep-learning", to: "ml-systems", enter: 38 },
  { from: "deep-learning", to: "computer-vision", enter: 26 },
  { from: "deep-learning", to: "nlp", enter: 26 },
  { from: "nlp", to: "large-language-models", enter: 14 },
  { from: "reinforcement-learning", to: "large-language-models", enter: 38 },
];

const LABELS = new Map<string, string>(
  TOPIC_NODES.map((node) => [node.id, node.label.replace("\n", " ")]),
);

export function topicLabel(id: string): string | undefined {
  return LABELS.get(id);
}

/** Straight when the source lines up with the landing point, a smooth S otherwise. */
export function edgePath(edge: TopicEdge): string {
  const from = TOPIC_NODES.find((node) => node.id === edge.from);
  const to = TOPIC_NODES.find((node) => node.id === edge.to);
  if (!from || !to) return "";
  const x1 = COLUMN_X[from.col] + NODE_WIDTH;
  const y1 = from.y + NODE_HEIGHT / 2;
  // Stop short so the arrowhead's tip, not its base, touches the box.
  const x2 = COLUMN_X[to.col] - 2;
  const y2 = to.y + edge.enter;
  if (y1 === y2) return `M${x1},${y1} H${x2}`;
  // An edge that skips columns runs along its own row and turns only in the last gap.
  const turn = to.col - from.col > 1 ? COLUMN_X[to.col - 1] + NODE_WIDTH : x1;
  const mid = (turn + x2) / 2;
  const run = turn > x1 ? ` H${turn}` : "";
  return `M${x1},${y1}${run} C${mid},${y1} ${mid},${y2} ${x2},${y2}`;
}

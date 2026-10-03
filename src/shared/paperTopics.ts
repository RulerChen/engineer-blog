// What a paper is about, one per paper; a curator's "what to read next", deliberately not the blog's tag vocabulary.

export interface PaperTopic {
  /** Prefixed by section, because "fundamentals" is a different shelf in each. */
  id: string;
  label: string;
}

export interface PaperSection {
  id: string;
  label: string;
  /** In reading order: the theory, then the subject, then the systems people shipped. */
  topics: PaperTopic[];
}

export const PAPER_SECTIONS: PaperSection[] = [
  {
    id: "distributed-system",
    label: "Distributed system",
    topics: [
      { id: "ds-fundamentals", label: "Fundamentals" },
      { id: "ds-consensus", label: "Consensus" },
      { id: "ds-real-system", label: "Real system" },
    ],
  },
  {
    id: "networking",
    label: "Networking",
    topics: [
      { id: "net-algorithm", label: "Algorithm" },
      { id: "net-sdn", label: "SDN" },
    ],
  },
  {
    id: "database",
    label: "Database",
    topics: [
      { id: "db-fundamentals", label: "Fundamentals" },
      { id: "db-data-model", label: "Data model" },
      { id: "db-real-system", label: "Real system" },
    ],
  },
  {
    id: "machine-learning",
    label: "Machine learning",
    topics: [
      { id: "ml-fundamentals", label: "Fundamentals" },
      { id: "ml-classic", label: "Classic ML" },
      { id: "ml-nlp", label: "NLP" },
      { id: "ml-rl", label: "RL" },
      { id: "ml-llm", label: "LLM" },
      { id: "ml-infra", label: "ML infra" },
    ],
  },
];

const TOPIC_IDS = new Set(
  PAPER_SECTIONS.flatMap((section) => section.topics.map((topic) => topic.id)),
);

export function isPaperTopic(id: string): boolean {
  return TOPIC_IDS.has(id);
}

/**
 * What a paper is *about*, hand-assigned, one per paper. A closed two-level set,
 * kept here rather than in the data for the same reason entry types are: each
 * entry carries a label and a line of prose the page draws, so adding one is a
 * deliberate edit, not a typing decision.
 *
 * Deliberately not the blog's tag vocabulary. That vocabulary exists to narrow
 * 542 posts, and its first level put all 28 machine-learning papers in one heap
 * while its second level — `training` sits on word2vec, Megatron, ZeRO and PPO
 * alike — could not tell them apart. These topics are a curator's answer to
 * "what do I read next", which is not a filter.
 */
export interface PaperTopic {
  /** Prefixed by domain, because `fundamentals` means a different shelf in each. */
  id: string;
  /**
   * The shelf, named the way someone looking for it would say it out loud, and
   * named well enough to stand alone — there is no line of prose under it. The
   * same few names recur across domains on purpose, so the second domain a
   * reader opens is already familiar.
   */
  label: string;
}

/** The top level: which literature you are in, and the reader's first decision. */
export interface PaperSection {
  id: string;
  label: string;
  topics: PaperTopic[];
}

/**
 * Four domains, and inside each the shelves in the order they are worth reading:
 * the theory, then the subject, then the systems people actually shipped.
 *
 * Nothing here is numbered. Within a shelf the papers run oldest first and that
 * is all the order that is claimed — where two papers really are one line of
 * work, like GFS and HDFS, they share a `series` in the data and the page draws
 * them chained inside a single card instead.
 */
export const PAPER_SECTIONS: PaperSection[] = [
  {
    id: "distributed-system",
    label: "Distributed system",
    topics: [
      {
        id: "ds-fundamentals",
        label: "Fundamentals",
      },
      {
        id: "ds-consensus",
        label: "Consensus",
      },
      {
        id: "ds-real-system",
        label: "Real system",
      },
    ],
  },
  {
    id: "networking",
    label: "Networking",
    topics: [
      {
        id: "net-algorithm",
        label: "Algorithm",
      },
      {
        id: "net-sdn",
        label: "SDN",
      },
    ],
  },
  {
    id: "database",
    label: "Database",
    topics: [
      {
        id: "db-fundamentals",
        label: "Fundamentals",
      },
      {
        id: "db-data-model",
        label: "Data model",
      },
      {
        id: "db-real-system",
        label: "Real system",
      },
    ],
  },
  {
    id: "machine-learning",
    label: "Machine learning",
    topics: [
      {
        id: "ml-fundamentals",
        label: "Fundamentals",
      },
      {
        id: "ml-classic",
        label: "Classic ML",
      },
      {
        id: "ml-nlp",
        label: "NLP",
      },
      {
        id: "ml-rl",
        label: "RL",
      },
      {
        id: "ml-llm",
        label: "LLM",
      },
      {
        id: "ml-infra",
        label: "ML infra",
      },
    ],
  },
];

/** Every topic, flattened, in the order the sections declare them. */
export const PAPER_TOPICS: PaperTopic[] = PAPER_SECTIONS.flatMap((section) => section.topics);

const BY_ID = new Map(PAPER_TOPICS.map((topic) => [topic.id, topic]));

export function paperTopic(id: string | undefined): PaperTopic | undefined {
  return id === undefined ? undefined : BY_ID.get(id);
}

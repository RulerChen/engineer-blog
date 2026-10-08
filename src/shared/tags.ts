// The blog's whole tag vocabulary, which the build checks every entry against; docs/tags.md says how to choose.

/** A closed shelf of technical problems; every blog entry names exactly one as its `domain`. */
export interface Domain {
  id: string;
  label: string;
  /** Techniques and problems the menu lists under the domain; any entry may carry one, whatever its own domain. */
  concepts: string[];
}

/** The fields, each with a one-line note on where its edge is; a component or a practice is a concept inside one, never one of these. */
export const DOMAINS: Domain[] = [
  // What runs on the user's device: browser and mobile apps.
  { id: "frontend", label: "Frontend", concepts: ["rendering", "ssr", "offline", "mobile"] },
  // Moving traffic: load balancers, proxies, gateways, meshes, the edge, and the standard protocols underneath.
  {
    id: "network",
    label: "Network",
    concepts: [
      "load-balancing",
      "proxy",
      "service-mesh",
      "edge",
      "rdma",
      "dns",
      "http",
      "websocket",
      "webrtc",
    ],
  },
  // The layer code runs on: hardware, the kernel, containers, and the clusters that schedule and configure them.
  {
    id: "infrastructure",
    label: "Infrastructure",
    concepts: [
      "hardware",
      "async-io",
      "isolation",
      "autoscaling",
      "stateful-workload",
      "control-plane",
    ],
  },
  // OLTP datastores and caches, and the blob, block and file stores underneath them.
  {
    id: "database",
    label: "Database & storage",
    concepts: [
      "sharding",
      "replication",
      "caching",
      "schema-change",
      "secondary-index",
      "storage-engine",
      "connection-pooling",
      "key-value",
      "time-series",
      "object-storage",
      "file-system",
      "tiering",
      "file-sync",
    ],
  },
  // Analytics and the logs that feed it: pipelines, event streams, lakes, query engines.
  {
    id: "data",
    label: "Data",
    concepts: [
      "data-lake",
      "etl",
      "stream-processing",
      "pub-sub",
      "cdc",
      "query-engine",
      "ingestion",
      "file-format",
    ],
  },
  // A backend split across machines and kept in agreement: services and their interfaces, consensus, consistency, transactions, queues, workflows.
  {
    id: "distributed-systems",
    label: "Distributed systems",
    concepts: [
      "microservice",
      "monolith",
      "event-driven",
      "rpc",
      "consensus",
      "coordination",
      "consistency",
      "transactions",
      "workflow",
      "job-queue",
      "crdt",
    ],
  },
  // Indexing, retrieval and ranking.
  { id: "search", label: "Search", concepts: ["indexing", "ranking", "vector"] },
  // Training, serving and applying models.
  {
    id: "machine-learning",
    label: "Machine learning",
    concepts: [
      "training",
      "inference",
      "feature-store",
      "recommendation",
      "llm",
      "agent",
      "computer-vision",
    ],
  },
  // Keeping systems up and seeing inside them: overload, failover, disaster recovery, telemetry, load and chaos testing.
  {
    id: "reliability",
    label: "Reliability & observability",
    concepts: ["overload-control", "failover", "disaster-recovery", "metrics", "tracing"],
  },
  // Access control, attack mitigation, vulnerabilities.
  { id: "security", label: "Security", concepts: ["access-control"] },
  // Writing, checking, building and shipping code: languages and runtimes, static analysis, testing, version control, builds, CI/CD.
  {
    id: "programming",
    label: "Programming",
    concepts: [
      "memory-management",
      "garbage-collection",
      "concurrency",
      "static-analysis",
      "testing",
      "version-control",
      "monorepo",
    ],
  },
  // Not decided yet: a queue to work through, never a home.
  { id: "other", label: "Other", concepts: [] },
];

/** Concepts with no domain: they narrow the list across fields and say nothing about which field an entry is in. */
export const CROSS_DOMAIN: string[] = [
  // The post is about moving from A to B, a technology or a major version: why, how, or the cut-over.
  "migration",
  // An analysis of one specific outage, the company's own or someone else's.
  "incident",
  // The hunt for one specific bug or performance anomaly.
  "debugging",
  // Holding connections open to clients and pushing updates over them.
  "real-time",
  // Running one system across regions or data centers.
  "multi-region",
  // Location data: spatial indexes, maps, GPS.
  "geospatial",
];

/** Things someone outside the company could run, sorted, once posts from two blogs work on one; an in-house system is not one unless open-sourced. */
export const TECHNOLOGIES: string[] = [
  "aurora",
  "cassandra",
  "clickhouse",
  "dynamodb",
  "eks",
  "elasticsearch",
  "envoy",
  "etcd",
  "flink",
  "git",
  "go",
  "google-dataflow",
  "grpc",
  "hadoop",
  "hbase",
  "hdfs",
  "hudi",
  "iceberg",
  "java",
  "kafka",
  "kinesis",
  "kubernetes",
  "memcached",
  "mysql",
  "nginx",
  "nodejs",
  "opensearch",
  "parquet",
  "postgresql",
  "prometheus",
  "pytorch",
  "ray",
  "react",
  "redis",
  "rocksdb",
  "rust",
  "s3",
  "spark",
  "tensorflow",
  "thrift",
  "trino",
  "vitess",
  "webassembly",
  "zookeeper",
];

/** An id the live site once used, to the one that replaced it, so a shared ?tags= link still opens the same shelf. */
export const ALIASES = new Map<string, string>([
  ["alerting", "metrics"],
  ["api-gateway", "proxy"],
  ["architecture", "distributed-systems"],
  ["backup", "disaster-recovery"],
  ["cloud", "infrastructure"],
  ["container", "infrastructure"],
  ["dataflow", "google-dataflow"],
  ["kernel", "infrastructure"],
  ["language", "programming"],
  ["load-balance", "load-balancing"],
  ["load-testing", "testing"],
  ["observability", "reliability"],
  ["operating-system", "infrastructure"],
  ["postmortem", "incident"],
  ["schema", "schema-change"],
  ["storage", "database"],
  ["wasm", "webassembly"],
  ["yarn", "hadoop"],
]);

export type Facet = "domain" | "concept" | "cross-domain" | "technology";

const DOMAIN_BY_ID = new Map(DOMAINS.map((domain) => [domain.id, domain]));
const CONCEPT_DOMAIN = new Map(
  DOMAINS.flatMap((domain) => domain.concepts.map((id) => [id, domain.id] as const)),
);
const CONCEPT_ORDER = new Map(DOMAINS.flatMap((domain) => domain.concepts).map((id, i) => [id, i]));
const CROSS_ORDER = new Map(CROSS_DOMAIN.map((id, i) => [id, i]));
const TECHNOLOGY_IDS = new Set(TECHNOLOGIES);

/** Which facet an id belongs to, or undefined when it is outside the vocabulary. */
export function facetOf(id: string): Facet | undefined {
  if (DOMAIN_BY_ID.has(id)) return "domain";
  if (CONCEPT_DOMAIN.has(id)) return "concept";
  if (CROSS_ORDER.has(id)) return "cross-domain";
  if (TECHNOLOGY_IDS.has(id)) return "technology";
  return undefined;
}

export function domainLabel(id: string): string | undefined {
  return DOMAIN_BY_ID.get(id)?.label;
}

/** The group a selected id is matched within: one for the domains, one per domain for its concepts, one each for cross-domain and technologies. */
export function filterGroup(id: string): string {
  return CONCEPT_DOMAIN.get(id) ?? facetOf(id) ?? "technology";
}

/** Reading order: a second domain, the entry's own concepts, other concepts, cross-domain, technologies. */
export function sortTags(domain: string, tags: string[]): string[] {
  const rank = (id: string): number => {
    if (DOMAIN_BY_ID.has(id)) return 0;
    const concept = CONCEPT_ORDER.get(id);
    if (concept !== undefined) return (CONCEPT_DOMAIN.get(id) === domain ? 1_000 : 2_000) + concept;
    const cross = CROSS_ORDER.get(id);
    if (cross !== undefined) return 3_000 + cross;
    return TECHNOLOGY_IDS.has(id) ? 4_000 : 5_000;
  };
  return tags.toSorted((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

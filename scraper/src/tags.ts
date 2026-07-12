/**
 * Canonical tag taxonomy — see
 * docs/superpowers/specs/2026-07-11-tag-taxonomy-design.md for the design.
 */
export const CANONICAL_TAGS = [
  "frontend",
  "backend",
  "mobile",
  "ai",
  "ml",
  "data",
  "infra",
  "databases",
  "observability",
  "architecture",
  "security",
  "devops",
  "open-source",
  "culture",
  "video",
  "ar-vr",
  "experimentation",
  "networking",
  "career",
  "product",
  "performance",
  "testing",
  "cloud",
  "general",
] as const;

export type CanonicalTag = (typeof CANONICAL_TAGS)[number];

/** A raw tag that didn't resolve via the static table or the keyword rules. */
export interface UnmappedTag {
  raw: string;
  source: string;
  count: number;
}

/** Exact-match lookup, keyed on the lowercased/trimmed raw tag. Covers every
 * raw tag seen across the current sources as of the taxonomy redesign. */
const EXACT_MATCH: Record<string, CanonicalTag> = {
  engineering: "general",
  technology: "general",
  infrastructure: "infra",
  "machine-learning": "ml",
  "production engineering": "infra",
  "ml applications": "ml",
  "software-architecture": "architecture",
  observability: "observability",
  "site-reliability-engineer": "devops",
  "data infrastructure": "data",
  culture: "culture",
  "data-modeling": "data",
  "distributed-systems": "architecture",
  data: "data",
  "data center engineering": "infra",
  "meta tech podcast": "general",
  android: "mobile",
  ios: "mobile",
  ai: "ai",
  netflix: "general",
  "big-data": "data",
  "data-engineering": "data",
  "analytics-engineering": "data",
  "data-architecture": "data",
  "software-development": "backend",
  "data-science": "data",
  forecasting: "data",
  "graph-database": "databases",
  "knowledge-graph": "data",
  api: "backend",
  "open-source": "open-source",
  graphql: "backend",
  workflow: "devops",
  "user-experience": "frontend",
  "data-privacy": "security",
  privacy: "security",
  "ai research": "ai",
  devinfra: "devops",
  "security & privacy": "security",
  "virtual reality": "ar-vr",
  "video engineering": "video",
  "core infra": "infra",
  "recommendation-system": "ml",
  "large-language-models": "ai",
  kueue: "infra",
  aws: "cloud",
  kubernetes: "infra",
  automation: "devops",
  "site-reliability": "devops",
  "data-validation": "data",
  "data-reliability": "data",
  experimentation: "experimentation",
  "data-governance": "data",
  "data-orchestration": "data",
  regression: "testing",
  "predictive-analytics": "ml",
  operations: "devops",
  cassandra: "databases",
  icebergs: "databases",
  "data-movement": "data",
  notifications: "backend",
  recommendations: "ml",
  "ai-agent": "ai",
  "agentic-workflow": "ai",
  "causal-inference": "data",
  "software-engineering": "general",
  "platform-engineering": "infra",
  microservices: "architecture",
  // AWS "News" blog category noise — meta/marketing labels with no topic signal.
  announcements: "general",
  news: "general",
  launch: "general",
  featured: "general",
  events: "general",
  webinars: "general",
  regions: "general",
  "thought leadership": "general",
  "partner solutions": "general",
  sustainability: "general",
  industries: "general",
  retail: "general",
  education: "general",
  startup: "general",
  saas: "general",
  "marketing & advertising": "general",
  "internet of things": "general",
  "game development": "general",
  games: "general",
  "contact lens for amazon connect": "general",
  developer: "general",
  // AWS product/service families and generic vocabulary not caught by keyword rules.
  "developer tools": "devops",
  "migration & transfer services": "devops",
  migration: "devops",
  resilience: "devops",
  "management tools": "devops",
  "management & governance": "devops",
  "billing & account management": "devops",
  "resource access manager (ram)": "devops",
  identity: "security",
  compute: "infra",
  storage: "infra",
  "application services": "backend",
  ".net": "backend",
  python: "backend",
  // One-off AWS service names not worth generalizing into a keyword rule.
  "amazon opensearch service": "observability",
  "amazon workspaces": "infra",
  "amazon connect": "general",
  "amazon gamelift": "general",
  "price reduction": "general",
  "amazon eks distro": "infra",
  "amazon corretto": "backend",
  "amazon location": "general",
  "amazon elastic vmware service (amazon evs)": "infra",
  "amazon application recovery controller (arc)": "devops",
  "amazon simple email service (ses)": "backend",
};

/** Ordered keyword/substring fallback rules, tried only when the exact-match
 * table misses. Lets new source blogs' categories auto-classify without a
 * `tags.ts` edit for common engineering-blog vocabulary. */
const KEYWORD_RULES: { pattern: RegExp; tag: CanonicalTag }[] = [
  { pattern: /kubernetes|k8s|docker|container/i, tag: "infra" },
  { pattern: /android|ios|mobile|swift|kotlin/i, tag: "mobile" },
  { pattern: /machine.?learning|deep.?learning|\bml\b|neural/i, tag: "ml" },
  {
    pattern:
      /\bllm\b|large.?language.?model|generative.?ai|generative.?bi|foundation.?model|\bai\b|gpt|artificial.?intelligence|bedrock|sagemaker|\bamazon q\b|\bnova\b|personalize|\bpolly\b|\bkiro\b|strands.?agents/i,
    tag: "ai",
  },
  {
    pattern:
      /database|\bsql\b|nosql|postgres|mysql|aurora|dynamodb|redshift|\brds\b|documentdb|neptune|elasticache|memorydb|keyspaces|\bdsql\b/i,
    tag: "databases",
  },
  {
    pattern:
      /security|encrypt|vulnerabilit|auth(entication|orization)?|guardduty|cognito|inspector|compliance/i,
    tag: "security",
  },
  { pattern: /privacy/i, tag: "security" },
  { pattern: /observ|monitoring|logging|tracing|metrics/i, tag: "observability" },
  { pattern: /devops|ci.?cd|deploy|release|automation|reliability|\bsre\b/i, tag: "devops" },
  { pattern: /cloud|\baws\b|\bgcp\b|azure/i, tag: "cloud" },
  { pattern: /network|traffic|cdn|dns|\bvpc\b|route.?53/i, tag: "networking" },
  { pattern: /open.?source/i, tag: "open-source" },
  { pattern: /culture|diversity|inclusion|life.?at/i, tag: "culture" },
  { pattern: /video|streaming|media/i, tag: "video" },
  { pattern: /virtual.?reality|augmented.?reality|\bvr\b|\bar\b|metaverse/i, tag: "ar-vr" },
  { pattern: /experiment|a\/b.?test/i, tag: "experimentation" },
  { pattern: /career|hiring|interview|onboarding/i, tag: "career" },
  { pattern: /\bproduct\b/i, tag: "product" },
  { pattern: /performance|latency|scalability|optimi[sz]/i, tag: "performance" },
  { pattern: /test(ing)?|quality.?assurance|\bqa\b/i, tag: "testing" },
  { pattern: /architecture|microservice|distributed.?system/i, tag: "architecture" },
  {
    pattern:
      /data|analytic|pipeline|etl|athena|\bemr\b|kinesis|quick.?sight|quick.?suite|business.?intelligence/i,
    tag: "data",
  },
  {
    pattern:
      /infra|platform.?engineering|site.?reliability|\bec2\b|\bebs\b|\bfsx\b|lightsail|graviton|firecracker|serverless|auto.?scaling|elastic.?load.?balancing|lambda@edge|elastic.?block.?store|\bs3\b/i,
    tag: "infra",
  },
  { pattern: /frontend|\bui\b|\bux\b|react|css|design.?system/i, tag: "frontend" },
  {
    pattern:
      /backend|\bapi\b|graphql|microservice|eventbridge|\bsns\b|\bsqs\b|application.?integration/i,
    tag: "backend",
  },
];

function resolveTag(rawTag: string): CanonicalTag | null {
  const key = rawTag.trim().toLowerCase();
  if (!key) return null;
  if ((CANONICAL_TAGS as readonly string[]).includes(key)) return key as CanonicalTag;
  const exact = EXACT_MATCH[key];
  if (exact) return exact;
  for (const rule of KEYWORD_RULES) {
    if (rule.pattern.test(key)) return rule.tag;
  }
  return null;
}

/** Collects raw tags that didn't resolve, for the end-of-run review artifact. */
export class UnmappedTagCollector {
  private readonly entries = new Map<string, UnmappedTag>();

  record(raw: string, source: string): void {
    const key = `${source}:${raw.toLowerCase()}`;
    const existing = this.entries.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      this.entries.set(key, { raw, source, count: 1 });
    }
  }

  list(): UnmappedTag[] {
    return [...this.entries.values()];
  }
}

/** Shared across a scrape run so every source's misses land in one report. */
export const unmappedTags = new UnmappedTagCollector();

/** Resolves raw RSS/scraped category strings into deduplicated canonical
 * tags, recording any that don't resolve on `unmapped` for later review. */
export function resolveTags(
  rawTags: string[],
  source: string,
  unmapped: UnmappedTagCollector = unmappedTags,
): CanonicalTag[] {
  const result = new Set<CanonicalTag>();
  for (const rawTag of rawTags) {
    const trimmed = rawTag.trim();
    if (!trimmed) continue;
    const tag = resolveTag(trimmed);
    if (tag) {
      result.add(tag);
    } else {
      unmapped.record(trimmed, source);
    }
  }
  return [...result];
}

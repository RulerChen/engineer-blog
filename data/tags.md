# Tag vocabulary

Tags are a flat list on disk; the structure is here. **Every entry carries exactly one domain** — the first level, from the closed set below, `other` when nothing fits and never nothing at all. After it come the optional levels that narrow it: `domain → concept → technology`.

Neither of the last two is required and they are independent. Two or three tags is the normal shape and five is the hard ceiling; past five the entry is being described rather than filed. The ceiling is a limit, not a target — reach for the fourth and fifth only when the post genuinely works on that many things, and never drop a technology the post is actually about to stay at three. Never add a tag for something the post does not actually work on — `mysql` belongs on "Upgrading MySQL at Shopify", not on a post that merely stores something in MySQL along the way.

## Domains

Closed set; adding one is a deliberate change to this file, not a typing decision at the form. A domain names a class of technical problem, never a team, a product, or a company's business — `platform`, `developer-experience` and `sync` were all tried and removed for exactly that. A post may carry two when it genuinely spans both; a third means it is being summarized rather than filed.

| Domain             | Recurring concepts under it                                                                |
| ------------------ | ------------------------------------------------------------------------------------------ |
| `frontend`         | `offline`                                                                                  |
| `mobile`           | `ios` `android`                                                                            |
| `network`          | `load-balance` `dns` `tls` `http` `proxy`                                                  |
| `operating-system` | `kernel`                                                                                   |
| `database`         | `sharding` `replication` `migration` `caching` `schema` `backup`                           |
| `data`             | `data-lake` `cdc` `etl` `stream-processing` `query-engine`                                 |
| `machine-learning` | `agent` `training` `llm` `inference`                                                       |
| `container`        | `kubernetes` `docker`                                                                      |
| `reliability`      | `overload-control` `postmortem` `disaster-recovery` `capacity-planning`                    |
| `architecture`     | `monorepo` `monolith` `microservice` `ci-cd` `api-gateway` `job-queue` `geospatial` `crdt` |
| `api-design`       | `rest` `graphql` `grpc`                                                                    |
| `storage`          | `object-storage` `block-storage` `tiering` `compression` `encoding`                        |
| `search`           | `indexing` `vector` `ranking`                                                              |
| `testing`          | `load-testing` `chaos-testing`                                                             |
| `language`         | `static-analysis` `memory-management` `garbage-collection` `jit`                           |
| `observability`    | `tracing` `metrics` `logging` `profiling` `alerting`                                       |
| `cloud`            | `serverless`                                                                               |
| `security`         | -                                                                                          |
| `hardware`         | -                                                                                          |
| `other`            | -                                                                                          |

`other` is a queue, not a domain: it means the maintainer has not decided yet. More than a handful sitting there means a domain is missing — read them together and see what they share. An entry never stays untagged instead, because untagged is invisible to every filter and `other` is at least a list someone can work through.

## Concepts and technologies

A concept is a technique or a problem, never a product — `sharding`, not `vitess`. The table binds in both directions: a concept may only be used under the domain it is listed beneath. An entry that wants a concept its domain does not carry either takes that concept's domain as its second one — the Spark-on-Kubernetes post is `data` and `container`, which is what lets it keep `kubernetes` — or goes without the concept. Borrowing one across domains is what makes the topic filter lie about what a domain contains, and `migration` on the Nginx-to-Envoy post is the tempting case that is still not allowed.

A concept with no entries behind it yet is fine, and several above are there on purpose. The topic filter is built from the data rather than from this file, so an unused concept never appears in the UI and costs nothing; what it buys is the next person reaching for `service-mesh` instead of inventing `mesh`. The form can only suggest tags already in the data, which makes this file the one place a not-yet-used concept can be written down.

**Technologies are not maintained here, by design.** Product names are an open set that grows with the industry, and enumerating them guarantees this file goes stale. Write the name the post uses, lowercased and dashed: `postgresql`, `react-native`, `webgpu`.

## Changing it

**Promote** a concept to a domain once it passes roughly ten entries and they have stopped sharing anything beyond the concept itself. **Absorb** one that ends up on a single entry after a full pass — that is a label, not a filter. This applies to concepts in use; one with no entries is a reservation and stays.

**Never** split a domain because it is large: `database` is a quarter of the list, and the levels beneath it plus the topic filter's All mode narrow it. Size is not a defect, incoherence is. And do not let one company's output drive a domain — several are dominated by a single blog only because `data/source.md` is still half-scanned.

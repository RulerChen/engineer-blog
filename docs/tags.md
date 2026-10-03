# Tag vocabulary

Every blog entry carries one `domain` and up to five `tags`. The vocabulary itself is [src/lib/tags.ts](../src/lib/tags.ts), and the build rejects any id outside it. This file says how to choose. Papers are filed by `topic` instead; see AGENTS.md.

```json
{
  "title": "Partitioning GitHub’s relational databases to handle scale",
  "domain": "database",
  "tags": ["sharding", "mysql", "vitess"]
}
```

## Four kinds of id

**Domain.** A field of engineering: an area with its own body of knowledge, several concepts of its own, and posts from many blogs. There are twelve, `other` included, and each has a one-line note in `tags.ts` on where its edge is. A component (`job-queue`) or a practice (`testing`, `api-design`) is never a domain; it is a concept inside one, or a cross-domain concept when it spans several. A product category is not a tag at all: `messaging` and `media` were tried as domains and removed. Messaging became the concepts `pub-sub` and `job-queue`, and a video or voice post is described by what it works on, such as `webrtc` or `edge`. `platform`, `developer-experience` and `sync` were removed earlier because they name a team, a goal or a product.

**Concept.** A technique or a problem, never a product: `sharding`, not `vitess`. Every concept is listed under one domain in the topic menu, and that is all the listing means. Any entry may carry any concept, and carrying one never puts the entry in another domain. The one exception to "never a product" is network protocols defined by a standards body (IETF, W3C, IEEE), which are concepts under `network`: `dns`, `http`, `websocket`.

**Cross-domain concept.** A concept no domain lists. Most describe the kind of story (`migration`, `incident`, `debugging`, `cost`). The rest are subjects that live in several fields at once (`real-time`, `multi-region`, `geospatial`). The set is closed. A new one has to pass two tests: its entries span at least three domains, and it still narrows, sitting on roughly a tenth of the entries or fewer. `performance` fails the second test: so many posts are about speed that the tag would narrow nothing.

**Technology.** Something a reader outside the company could run: an open-source project or a product you can buy. An in-house system is not a tag unless it was open-sourced (LogDevice, H3 and Vitess are tags; Manhattan and Magic Pocket are not). Its name belongs in the title and the summary, where search finds it.

## Filing an entry

1. Pick the domain the post is mainly about. Use `other` when nothing fits, never nothing at all.
2. Add the concepts the post works on, from any domain.
3. If the post belongs as much to a second field, put that domain's id in `tags`. Only one is allowed. It is the only way onto a second shelf, because the site lists an entry under a domain only when its card shows that domain.
4. Add a cross-domain concept if the story is one.
5. Add the technologies the post works on.

Five tags is the ceiling, not counting the domain. Two or three is the normal shape, and zero is fine when no concept fits. Tag only what the post actually works on: `mysql` belongs on "Upgrading MySQL at Shopify", not on a post that merely stores something in MySQL along the way. The same holds for `migration`: the post has to be about moving from A to B (why, how, or the cut-over). A post that only mentions the old system as the reason for a new design does not qualify, and neither does resharding inside one system.

Order does not matter. The build sorts the tags as a second domain, the entry's own concepts, other concepts, cross-domain concepts, then technologies.

## Naming

Ids are lowercase and dashed. A concept is a noun: `load-balancing`, not `load-balance`. A technology drops its foundation or vendor prefix (`phoenix`, not `apache-phoenix`) unless the bare name is a generic word (`google-pubsub`, `google-dataflow`). When a technology is a component of a larger one, tag the component the post works on: `hdfs` or `yarn` rather than `hadoop`, which is for the ecosystem as a whole.

## Changing it

`npm run tag-stats` prints the numbers these rules are judged by.

- **Add a technology** with one line in `TECHNOLOGIES`. The build error names the id that is missing.
- **Add a concept** under the domain readers would look for it in. A concept with no entries yet is a reservation: the menus are built from the data, so it costs nothing on the page, and it tells the next person which id to use.
- **Add a domain** only for a field as defined above, once its posts come from several blogs and already need several concepts of their own. A concept that grows large stays a concept: `job-queue` and `pub-sub` were once promoted to a `messaging` domain, and they belong under distributed systems and data.
- **Move a concept** when readers would look for it under another domain. Where its entries live is a hint, not the rule: `consistency` is listed under distributed systems although every entry carrying it is a database post.
- **Never split a domain because it is large.** `database` is over a quarter of the list, and its concepts narrow it. Split a domain when it is incoherent, which shows as a high "no concept" share and a high "second domain" share together. `architecture` once looked like that.
- **Absorb a concept** that is still on a single entry after a full pass, unless it names a recognized subfield such as `ddos` or `erasure-coding`.
- **Rename** by adding the old id to `ALIASES` in the same change. Old `?tags=` links keep working, and the build rejects the old id in data.
- **`other` is a queue, not a domain.** More than five entries there means something is missing: read them together and see what they share.
- **Do not let one company's output drive a domain.** A field has posts from many blogs; a shelf one blog fills is a label for that blog.

## On the page

The topic menu lists the domains first, then each domain's concepts, the cross-domain concepts and the technologies. An entry matches a pick only when its card shows it, as its domain, a second domain or a tag. "Any" keeps entries carrying one pick from each group: the domains form one group, each domain's concepts another, the cross-domain concepts one and the technologies one. So `mysql` + `postgresql` widens and `sharding` + `mysql` narrows. "All" keeps only entries carrying every pick.

# Curation guideline

This document is a guideline for curating blog posts. It is a guide for what to collect and what not to collect.

Unless user specifies otherwise, please read @docs/source.md for the url of the blog, and only fetch posts after the date defined in the that file.

## Do collect

- The evolution of a system, describe the current state, what did not work, where the limits are, and how it was improved. For example like how Discord scaled their chat system by migrating from MongoDB to Cassandra to ScyllaDB.
- The decision-making process behind a system, what trade-offs were made, and why. For example like how Figma gave up on using CRDTs for their collaborative editing system or why Uber decided to migrate from PostgreSQL to MySQL.
- The innovation of a system, what was done, and how it was implemented. For example like how Google built their Spanner database or how Meta designed and trained their ad recommendation ai model.
- The experience of building a system, what was learned, and what would be done differently. For example like how Uber run their software factory more efficiently.
- The experience of optimizing a system, what was learned, and what would be done differently. For example like how Netflix optimized their video streaming system.
- The experience of debugging a system, how the problem was identified, what was done to fix it, and what was learned. For example like how PostgresQL find the root cause of a data corruption issue.
- Describe a specific technical problem, introduce the context, the problem, and how it was solved. For example like how to improve Go runtime performance by optimizing the garbage collector or how to improve I/O latency by using io_uring.

## Don't collect

- Don't collect posts about products announcements, marketing, hiring, culture sharing, management, awards, or any non-technical topics.
- Don't collect posts written by non-engineers or intern.
- Don't collect tutorials and getting-started material, own tools or public ones.
- Don't collect the posts that are too short (< 800 words) or don't provide enough technical details, for example like a post that only contains a few sentences or a post that only contains a link to a video or a slide deck.

## Output

After scanning a blog, respond with a list of picks and a list of unsure posts, and don't write to the company's `data/<source>.json` until the picks are confirmed.

```md
## Collect

- [title](url) / YYYY-MM-DD / one sentence on why it passes
- ...

## Unsure

- [title](url) / YYYY-MM-DD / what makes it borderline / lean: collect|reject
- ...
```

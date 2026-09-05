# Curation guideline

This document is a guideline for curating blog posts. It is a guide for what to collect and what not to collect.

Unless user specifies otherwise, please read @docs/source.md for the url of the blog, and only fetch posts after the date defined in the that file.

## Do collect

- The evolution of a system, describe the current state, what did not work, where the limits are, and how it was improved. For example like how Discord scaled their chat system by migrating from MongoDB to Cassandra to ScyllaDB.
- The decision-making process behind a system, what trade-offs were made, and why. For example like how Figma gave up on using CRDTs for their collaborative editing system or why Uber decided to migrate from PostgreSQL to MySQL.
- The experience of building a system, what was learned, and what would be done differently. For example like how Uber run their software factory more efficiently.
- The experience of optimizing a system, what was learned, and what would be done differently. For example like how Netflix optimized their video streaming system.
- The specified domain for the company, for example like how Twitter built their timeline system and search recommendation system.
- The experience of debugging a system, how the problem was identified, what was done to fix it, and what was learned. For example like how PostgresQL find the root cause of a data corruption issue.

## Don't collect

- Don't collect posts about products announcements, marketing, hiring, culture sharing, management, awards, or any non-technical topics.
- Don't collect posts written by non-engineers or intern.
- Don't collect tutorials and getting-started material, own tools or public ones.
- Don't collect the posts without technical depth, for example, posts that only describe the architecture of a system without any technical details.

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

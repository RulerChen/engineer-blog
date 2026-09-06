# Curation guideline

This document is a guideline for curating blog posts. It is a guide for what to collect and what not to collect.

Unless user specifies otherwise, read the source table in @README.md for the url of the blog, and only fetch posts after the date that table records for it. When a scan is done, move that date forward — the table is the only record of how far each blog has been read.

## Do collect

- The evolution of a system, describe the current state, what did not work, where the limits are, and how it was improved. For example like how Discord scaled their chat system by migrating from MongoDB to Cassandra to ScyllaDB.
- The decision-making process behind a system, what trade-offs were made, and why. For example like how Figma gave up on using CRDTs for their collaborative editing system or why Uber decided to migrate from PostgreSQL to MySQL.
- The innovation of a system, what was done, and how it was implemented. For example like how Google built their Spanner database or how Meta designed and trained their ad recommendation ai model.
- The experience of building a system, what was learned, and what would be done differently. For example like how Uber run their software factory more efficiently.
- The experience of optimizing a system, what was learned, and what would be done differently. For example like how Netflix optimized their video streaming system.
- The experience of debugging a system, how the problem was identified, what was done to fix it, and what was learned. For example like how PostgresQL find the root cause of a data corruption issue.
- Describe a specific technical problem, introduce the context, the problem, and how it was solved. For example like how to improve Go runtime performance by optimizing the garbage collector or how to improve I/O latency by using io_uring.
- The model behind a product feature: what it predicts, the objective it optimizes, the features it reads, how it was evaluated offline and online, and what the model it replaced got wrong. For example like how Netflix moved recommendation away from click-through proxies toward long-term member satisfaction, or how Amazon used graph neural networks to capture asymmetric related-product relationships.

## Don't collect

- Don't collect posts about products announcements, marketing, hiring, culture sharing, management, awards, or any non-technical topics.
- Don't collect posts written by an intern, or posts where nobody who built the thing is speaking. A Q&A written up by a staff writer still counts as long as the engineer or engineering manager answering it is describing a system their team runs.
- Don't collect tutorials and getting-started material, for a public tool or your own. Introducing your own system is fine, and most of the good posts do it — what is excluded is the how-to-use guide with no design rationale, the one that shows the API without saying what the alternatives were.
- Don't collect theoretical results with no production system behind them. A summary of a conference paper proving a competitive ratio is not an engineering blog post, even when it is published on a company's blog and opens with a paragraph about their cluster scheduler.
- Don't collect the posts that don't provide enough technical details, for example like a post that only contains a few sentences or a post that only contains a link to a video or a slide deck.

## On length

Under 800 words, a post is almost never carrying a mechanism, so treat that as a floor. Do not treat it as the test. Length is weakly correlated with what this list is for and reading the post is the only thing that settles it — a 1,100-word post that names the bottleneck, the fix and the number it moved belongs here, and a 3,000-word post that walks through a product's capabilities does not.

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

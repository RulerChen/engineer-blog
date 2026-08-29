# Curation guideline

How to scan a company engineering blog and decide what belongs in `data/entries.json`.

Read the post, not its length.

## The test

**Would an engineer who does not use this company's product still learn something they could apply?**

If yes, take it. If no, skip it. Everything below is that question in more detail.

## Do collect

- A specific system described under real production load, with the problem and the constraints named.
- A migration, rewrite, or architectural change where the reasoning is kept in — what broke, what was tried, why the final choice won, what it cost.
- Numbers measured in production: latency, throughput, cost, scale, before and after.
- A hard technical problem explained in enough detail that someone outside the company could act on it.
- Failures and postmortems — usually the highest-signal thing on any blog.

## Don't collect

- Product launches, feature announcements, changelogs, release notes — even when written by engineers.
- Marketing under an engineering byline: framed as how something was built, but really an argument for using it.
- Company and people posts: culture, hiring, onboarding, events, awards, team retrospectives.
- Tutorials and getting-started material, whether for their own tools or for well-known public ones.
- Opinion or prediction pieces with no system behind them.
- Work already represented in the list — the same work, not merely the same topic.
- Roundups and recaps of other posts.

## When unsure

1. Strip the company name from the title. Does it still describe a technical problem? If it now reads as an ad, or the takeaway is "this company is doing well", skip it.
2. Prefer fewer. The list is hand-curated — a borderline entry costs more than a missed one. Leave it out and say so.

## Never use as a signal

Word count. Recency. Popularity or share count. Whether the topic or tag already appears in the list — neither as a reason to include nor to exclude.

## Output when scanning

For each candidate, one line: title, URL, publish date, and one sentence on why it passes. List rejects separately as title + a few words on why — so the call can be overridden without re-reading the blog. Do not write to `data/entries.json` until the picks are confirmed.

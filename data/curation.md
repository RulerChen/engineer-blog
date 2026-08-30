# Curation guideline

How to scan a company engineering blog and decide what belongs in `data/entries.json`.

Read the post, not its length.

## The test

**Would an engineer who does not use this company's product still learn something they could apply?**

If yes, take it. If no, skip it. Everything below is that question in more detail.

## Do collect

- A specific system under real production load, with the problem and constraints named.
- A migration, rewrite, or architectural change with the reasoning kept in — what broke, what was tried, why the final choice won, what it cost.
- Numbers measured in production: latency, throughput, cost, scale, before and after.
- A hard technical problem explained well enough that an outsider could act on it.
- Failures and postmortems — usually the highest-signal thing on any blog.

## Don't collect

- Product launches, feature announcements, changelogs, release notes — even when written by engineers.
- Marketing under an engineering byline: framed as how something was built, but really an argument for using it.
- Company and people posts: culture, hiring, onboarding, events, awards, team retrospectives.
- Tutorials and getting-started material, for their own tools or for well-known public ones.
- Opinion or prediction pieces with no system behind them.
- Work already represented in the list — the same work, not merely the same topic.
- Roundups and recaps of other posts.

## When unsure

Strip the company name from the title. Does it still describe a technical problem? If it now reads as an ad, or the takeaway is "this company is doing well", it's a reject.

Otherwise it goes in **Unsure**, not in Reject. A borderline post is a call for the maintainer to make, and a good post lost to a silent reject costs more than one extra line to read.

## Never use as a signal

Word count. Recency. Popularity or share count. Whether the topic or tag already appears in the list — neither as a reason to include nor to exclude.

## Output when scanning

Three sections. Never drop a post from all three.

**Collect** — one line each: title, URL, publish date, one sentence on why it passes.

**Unsure** — same format, plus what makes it borderline and which way you lean. Anything you would have rejected with hesitation belongs here.

**Reject** — no output needed.

Do not write to `data/entries.json` until the picks are confirmed.

The format of the output is

```md
title / url / publish date / one sentence on why it passes
```

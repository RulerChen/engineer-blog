# Curation guideline

How to scan a company engineering blog and decide what belongs in the list.

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
- Work whose premise has since dissolved — the constraint it solved was removed by the language, platform, or upstream project, or the system it describes is retired and its replacement is already in the list.

## When unsure

Strip the company name from the title. Does it still describe a technical problem? If it now reads as an ad, or the takeaway is "this company is doing well", it's a reject.

Otherwise it goes in **Unsure**, not in Reject. A borderline post is a call for the maintainer to make, and a good post lost to a silent reject costs more than one extra line to read.

## Never use as a signal

Word count. Recency. Popularity or share count. Whether the topic or tag already appears in the list — neither as a reason to include nor to exclude.

Age is not recency. Recency says the newer post is the better one — never a reason to include or exclude. Obsolescence says the problem itself is gone: the workaround is now a language feature, the tuning knob has a sane default, the project is archived. A 2016 post about a problem you still have goes in. Ask what changed in the world, not how long ago it was written, and say which change when you reject on this ground.

## Output when scanning

Three sections. Never drop a post from all three.

**Collect** — one line each: the title linked to the post, publish date, one sentence on why it passes.

**Unsure** — same format, plus what makes it borderline and which way you lean. Anything you would have rejected with hesitation belongs here.

**Reject** — no output needed.

Do not write to the company's `data/<source>.json` until the picks are confirmed.

When you do write, keep the file newest-first — a new entry usually belongs at the top.

The format of the output is

```md
title(link) / publish date / one sentence on why it passes
```

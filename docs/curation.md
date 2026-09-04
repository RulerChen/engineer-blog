# Curation guideline

How to scan a company engineering blog and decide what belongs in the list.

Read the post, not its length.

## The test

**Would an engineer who does not use this company's product still learn something they could apply?**

If yes, take it. If no, skip it. Everything below is that question in more detail.

## Do collect

- A specific system or domain under real production load, with the problem and constraints named.
- A migration, rewrite, or architectural change with the reasoning kept in — what broke, what was tried, why the final choice won, what it cost.
- A hard technical problem explained well enough that an outsider could act on it.

## Don't collect

- Product launches, feature announcements, changelogs, release notes — even when written by engineers.
- Marketing under an engineering byline: framed as how something was built, but really an argument for using it.
- Company and people posts: culture, hiring, onboarding, events, awards, team retrospectives.
- Tutorials and getting-started material, for their own tools or for well-known public ones.
- Opinion or prediction pieces with no system behind them.
- Roundups and recaps of other posts.

## Output when scanning

Three sections. Never drop a post from all three.

- **Collect** — one line each: the title linked to the post, publish date, one sentence on why it passes.
- **Unsure** — same format, plus what makes it borderline and which way you lean. Anything you would have rejected with hesitation belongs here. The format of the output is: ```title(link) / publish date / one sentence on why it passes```
- **Reject** — no output needed.

Do not write to the company's `data/<source>.json` until the picks are confirmed.

# Curation guideline

How to scan a company engineering blog and decide what belongs in the list.

Read the post, not only its length or title.

After reading the post, ask yourself: Would an engineer who does not use this company's product still learn something they could apply?

If yes, take it. If no, skip it. Everything below is that question in more detail.

## Do collect

- A production system or domain with the problem, constraints and solution.
- How to use a famous tool or component in a non-trivial way, with the reasoning behind the choices.
- A cutting edge component or algorithm with the reasoning behind the choices.
- A migration, rewrite or architectural change with the reasoning kept in: what broke, what was tried, why the final choice won, what it cost.

## Don't collect

- Product launches, feature announcements, changelogs, release notes.
- Marketing under an engineering byline. Detection: the post never says what did not work, what it cost, or where the limits are. A closing CTA is a strong signal.
- Company and people posts: culture, hiring, onboarding, events, awards.
- Tutorials and getting-started material, own tools or public ones.
- Opinion or prediction with no system behind it.
- Roundups and recaps of other posts.

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

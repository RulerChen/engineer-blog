When tagging a blog entry, follow `docs/tags.md`. The vocabulary is `src/lib/tags.ts`, and the build rejects any id outside it. Every blog entry gets exactly one `domain` from the closed set there: `other` if nothing fits, never nothing at all.

Papers carry no tags. They carry exactly one `topic` from the closed set in `src/lib/paperTopics.ts`, plus a one-or-two-sentence `summary`. The tag vocabulary exists to narrow hundreds of blog posts; for papers the reader's question is what to read next, which a tag cannot answer.

Never write the comments more than one line.

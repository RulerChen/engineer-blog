# engineer-blog

Aggregates posts from engineering/tech blogs across the industry into a single
searchable feed. A scraper (`scraper/`) fetches each company's RSS feed daily
and, where a real dated archive exists, backfills historical posts; the
frontend (`frontend/`) renders the merged result.

## Sources

43 companies are currently configured. "Status" reflects the data actually
present in `data/articles/` as of the last scrape, not just whether the
source is registered.

| Company                                                                            | Source ID          | Status                                                                                                                                                                                           |
| ---------------------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [Airbnb Engineering](https://medium.com/airbnb-engineering)                        | `airbnb`           | 10 articles (2026-04-07 → 2026-06-09)                                                                                                                                                            |
| [Anthropic](https://www.anthropic.com/news)                                        | `anthropic`        | 253 articles (2021-05-28 → 2026-07-09)                                                                                                                                                           |
| [Atlassian Developer](https://www.atlassian.com/blog/how-we-build)                 | `atlassian`        | 150 articles (2014-10-03 → 2026-07-08)                                                                                                                                                           |
| [AWS Architecture Blog](https://aws.amazon.com/blogs/architecture/)                | `aws-architecture` | 786 articles (2014-03-16 → 2026-07-09)                                                                                                                                                           |
| [AWS News Blog](https://aws.amazon.com/blogs/aws/)                                 | `aws-news`         | 360 articles (2024-11-26 → 2026-07-06) — archive capped at 45 pages; the full archive runs to 2004 across ~589 pages, disproportionate to every other source here                                |
| [Booking.com Tech Blog](https://medium.com/booking-com-data-science)               | `booking`          | 10 articles (2025-10-31 → 2026-07-10)                                                                                                                                                            |
| [Canva Engineering Blog](https://www.canva.dev/blog/engineering/)                  | `canva`            | 68 articles (2015-03-25 → 2025-10-20)                                                                                                                                                            |
| [The Cloudflare Blog](https://blog.cloudflare.com/tag/engineering/)                | `cloudflare`       | 19 articles (2024-06-03 → 2026-06-18) — no deeper archive available (feed/listing cap at ~20 recent posts)                                                                                       |
| [Cockroach Labs Blog](https://www.cockroachlabs.com/blog/)                         | `cockroachlabs`    | 99 articles (2021-02-22 → 2026-07-08)                                                                                                                                                            |
| [Coinbase Blog](https://www.coinbase.com/blog/landing/engineering)                 | `coinbase`         | **Blocked** — the site 403s every request in this environment, even with a browser User-Agent (looks like a TLS/network-level fingerprint check); may succeed from a different network (e.g. CI) |
| [Databricks Blog](https://www.databricks.com/blog/category/engineering)            | `databricks`       | 20 articles (2026-05-21 → 2026-07-08) — no deeper archive available                                                                                                                              |
| [Discord Blog: Engineering & Developers](https://discord.com/category/engineering) | `discord`          | 81 articles (2025-02-26 → 2026-06-30)                                                                                                                                                            |
| [DoorDash Engineering](https://careersatdoordash.com/engineering-blog/)            | `doordash`         | **Blocked** — same TLS/network-level block as Coinbase; may succeed from a different network                                                                                                     |
| [Dropbox Tech Blog](https://dropbox.tech/)                                         | `dropbox`          | 404 articles (2010-07-13 → 2026-06-25)                                                                                                                                                           |
| [GitHub Engineering](https://github.blog/engineering/)                             | `github`           | 166 articles (2013-02-21 → 2026-07-10)                                                                                                                                                           |
| [Google Developers](https://developers.googleblog.com/)                            | `google`           | 1993 articles (2011-02-03 → 2026-07-08)                                                                                                                                                          |
| [Google DeepMind](https://deepmind.google/blog/)                                   | `deepmind`         | 100 articles (2025-10-23 → 2026-07-03) — feed doesn't paginate further                                                                                                                           |
| [Grab Tech](https://engineering.grab.com/)                                         | `grab`             | 233 articles (2015-12-28 → 2026-07-10)                                                                                                                                                           |
| [Hugging Face](https://huggingface.co/blog)                                        | `huggingface`      | 823 articles (2020-02-14 → 2026-07-10)                                                                                                                                                           |
| [Instacart Engineering](https://tech.instacart.com/)                               | `instacart`        | 10 articles (2026-02-09 → 2026-07-01) — Medium-hosted, no deeper archive available                                                                                                               |
| [Instagram Engineering](https://engineering.fb.com/tag/instagram/)                 | `instagram`        | 27 articles (2019-11-25 → 2025-11-17) — folded into Engineering at Meta's `instagram` tag                                                                                                        |
| [Jane Street Tech Blog](https://blog.janestreet.com/)                              | `janestreet`       | 100 articles (2016-05-23 → 2026-06-15)                                                                                                                                                           |
| [LINE Engineering](https://techblog.lycorp.co.jp/en/)                              | `line`             | 50 articles (2025-10-01 → 2026-06-29) — LINE's own blog is defunct post-LY Corporation merger; sourced from the successor LY Corporation Tech Blog, no deeper archive available                  |
| [LinkedIn Engineering](https://engineering.linkedin.com/blog)                      | `linkedin`         | 6 articles (2023-09-19 → 2026-06-17) — no RSS feed exists; no deeper archive available                                                                                                           |
| [Lyft Engineering](https://eng.lyft.com/)                                          | `lyft`             | 10 articles (2025-12-15 → 2026-07-09) — Medium-hosted, no deeper archive available                                                                                                               |
| [Engineering at Meta](https://engineering.fb.com/)                                 | `meta`             | 9 articles (2026-05-12 → 2026-07-01)                                                                                                                                                             |
| [Netflix TechBlog](https://netflixtechblog.com/)                                   | `netflix`          | 10 articles (2026-06-19 → 2026-06-29) — Medium-hosted, no deeper archive available                                                                                                               |
| [Notion Engineering](https://www.notion.so/blog/topic/tech)                        | `notion`           | 24 articles (2021-05-18 → 2026-06-04)                                                                                                                                                            |
| [NVIDIA Developer Blog](https://developer.nvidia.com/blog/)                        | `nvidia`           | 100 articles (2026-04-24 → 2026-07-10) — feed doesn't paginate further                                                                                                                           |
| [OpenAI](https://openai.com/news/)                                                 | `openai`           | 1040 articles (2015-12-11 → 2026-07-10)                                                                                                                                                          |
| [PayPal Engineering](https://medium.com/paypal-tech)                               | `paypal`           | 10 articles (2023-10-24 → 2026-06-15) — Medium-hosted, no deeper archive available                                                                                                               |
| [Pinterest Engineering](https://medium.com/pinterest-engineering)                  | `pinterest`        | 10 articles (2026-04-13 → 2026-06-25) — Medium-hosted, no deeper archive available                                                                                                               |
| [Shopify Engineering](https://shopify.engineering/)                                | `shopify`          | 18 articles (2021-12-09 → 2026-06-09)                                                                                                                                                            |
| [Slack Engineering](https://slack.engineering/)                                    | `slack`            | 193 articles (2016-01-24 → 2026-06-11)                                                                                                                                                           |
| [Spotify Engineering](https://engineering.atspotify.com/)                          | `spotify`          | 13 articles (2025-11-23 → 2026-06-10) — no server-rendered pagination available                                                                                                                  |
| [Stripe Blog: Engineering](https://stripe.com/blog/engineering)                    | `stripe`           | 46 articles (2012-06-13 → 2026-03-02)                                                                                                                                                            |
| [Twitch Blog](https://medium.com/twitch-news/tagged/engineering)                   | `twitch`           | 10 articles (2017-10-10 → 2019-07-24) — **stale**: the live blog is fully client-rendered with no scrapeable path; this is a frozen historical slice from Twitch's old Medium presence           |
| [Uber Blog](https://eng.uber.com/)                                                 | `uber`             | 30 articles (2024-07-25 → 2026-07-09) — `eng.uber.com` is a single curated page with no pagination                                                                                               |
| [Yelp Engineering Blog](https://engineeringblog.yelp.com/)                         | `yelp`             | 333 articles (2010-08-08 → 2026-05-27)                                                                                                                                                           |
| [Duolingo Engineering](https://blog.duolingo.com/hub/engineering/)                 | `duolingo`         | 4 articles (2026-04-15 → 2026-06-24) — no pagination available                                                                                                                                   |
| [Etsy Engineering (Code as Craft)](https://codeascraft.com/)                       | `etsy`             | 20 articles (2023-07-14 → 2026-05-26) — deeper archive is bot-protected                                                                                                                          |
| [Figma Engineering](https://www.figma.com/blog/engineering/)                       | `figma`            | 39 articles (2023-05-02 → 2026-06-30) — single curated page, no pagination                                                                                                                       |
| [Datadog Engineering](https://www.datadoghq.com/blog/engineering/)                 | `datadog`          | 96 articles (2016-07-11 → 2026-07-01)                                                                                                                                                            |

### Not included

- **Twitter Engineering** — the blog was discontinued in the rebrand to X;
  `blog.x.com/engineering` is fully gated behind a Cloudflare JS challenge with
  no server-rendered content, feed, or dated archive reachable without
  executing browser JS.
- **GitLab**, **Twilio**, **Reddit** — investigated and skipped: none publish
  a genuinely engineering-specific blog with real per-item publish dates
  (as opposed to a general company blog, or a listing with no dates at all).

## Development

See `scraper/` and `frontend/` for the two workspaces. `npm run fetch -w
scraper` runs the daily RSS fetch across all sources; `npm run backfill -w
scraper -- <id>` backfills a single source's historical archive where
supported.

## Curating articles

Two hand-edited files at the repo root let you clean up the feed without
touching the scraper's per-source archives directly:

- **`data/excluded.json`** — a list of articles to hide and stop re-scraping.
  Add an entry with either the article's `url` or its `id` (both resolve to
  the same stable hash used everywhere else):

  ```json
  [
    {
      "url": "https://example.com/some-product-post",
      "note": "product announcement, not technical"
    }
  ]
  ```

  Excluded articles are dropped both at the next scrape (so they stop
  reappearing in `data/articles/<source>.json`) and immediately at the next
  frontend build (`npm run build -w frontend` runs `mergeArticles.ts`, which
  reads this file too) — no need to wait for the next scrape to hide one.

- **`data/manual.json`** — articles to add by hand that the scraper missed.
  Only `title`, `url`, and `publishedAt` are required; `id` is derived from
  `url` automatically, so if the scraper later picks up the same URL for
  real, the two entries merge into one (the scraped version wins):

  ```json
  [{ "title": "...", "url": "...", "publishedAt": "2026-07-10" }]
  ```

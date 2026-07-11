/**
 * A browser-like UA, not the project's own identity. Coinbase's and
 * DoorDash's blog WAFs return HTTP 403 for the honest
 * `engineer-blog-aggregator/1.0 (+...)` string (verified: identical
 * requests succeed with this UA and fail with that one) even though the
 * content is a public blog meant for syndication. User-approved tradeoff.
 */
export const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

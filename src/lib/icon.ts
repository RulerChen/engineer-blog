/**
 * The key an entry's site icon is filed under: the company name, slugified.
 * Icons are keyed by `source` rather than by the entry's domain because the
 * domain is not the company — Airbnb, Netflix and Lyft all publish on
 * medium.com, and GitHub writes on both github.blog and github.com. Keying by
 * domain gave the first group one shared, wrong logo and the second two copies
 * of the same one.
 */
export function iconKey(source: string | undefined): string | null {
  const slug = (source ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || null;
}

/**
 * Where to go looking for that icon: the entry's hostname, minus the `www.`
 * that is never part of how anyone names the site. Only fetchIcons.ts needs
 * this — a company is not something you can fetch, a host is.
 */
export function iconHost(url: string): string | null {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}

/**
 * Splits an icon file name into the source it serves and whether it is the
 * copy drawn for a dark card. `github.svg` and `github.dark.svg` are one
 * company's mark, so the suffix has to be read off the name rather than
 * treated as part of the key.
 */
export function parseIconFile(file: string): { key: string; dark: boolean } | null {
  const match = /^(.+?)(\.dark)?\.[^.]+$/.exec(file);
  return match ? { key: match[1], dark: Boolean(match[2]) } : null;
}

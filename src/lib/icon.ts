/**
 * The key an entry's site icon is filed under: the entry's hostname, minus the
 * `www.` that is never part of how anyone names the site. Icons are keyed by
 * domain rather than by `source` because the domain is what we can actually
 * fetch, and because two entries naming the same company always share it.
 */
export function iconDomain(url: string): string | null {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}

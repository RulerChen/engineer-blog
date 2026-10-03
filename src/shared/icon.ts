/** The key a source's icon is filed under in public/icons/: the company name slugified, since one host can serve many companies. */
export function iconKey(source: string | undefined): string | null {
  const slug = (source ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || null;
}

/** `github.svg` and `github.dark.svg` are one company's mark, so the theme suffix is not part of the key. */
export function parseIconFile(file: string): { key: string; dark: boolean } | null {
  const match = /^(.+?)(\.dark)?\.[^.]+$/.exec(file);
  return match ? { key: match[1], dark: Boolean(match[2]) } : null;
}

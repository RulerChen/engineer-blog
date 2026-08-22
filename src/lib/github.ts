import { serializeEntries, type EntryInput } from "./entry.js";

/**
 * Commits new entries straight to data/entries.json via the GitHub Contents
 * API, so the "auto" path in the entry form needs no backend of its own. The
 * token is a fine-grained PAT with Contents: read and write on this repo only;
 * it lives in localStorage on your machine, which is why the form always keeps
 * the manual copy-JSON path as an alternative.
 */

export const REPO_OWNER = "RulerChen";
export const REPO_NAME = "engineer-blog";
export const ENTRIES_PATH = "data/entries.json";
export const DEFAULT_BRANCH = "main";

const API_ROOT = "https://api.github.com";
const TOKEN_KEY = "engineer-blog-github-token";

export function loadToken(): string {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveToken(token: string): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // storage unavailable (private window, blocked cookies) — the manual path still works
  }
}

/** btoa() is latin1-only, so encode to UTF-8 bytes first. */
export function utf8ToBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function base64ToUtf8(base64: string): string {
  const binary = atob(base64.replace(/\s/g, ""));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function commitMessage(entry: EntryInput): string {
  return `data: add ${entry.kind ?? "article"} "${entry.title}"`;
}

/** A GitHub API failure with a message worth showing in the form. */
export class GitHubError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "GitHubError";
  }
}

function explain(status: number, body: string): string {
  switch (status) {
    case 401:
      return "GitHub rejected the token (401). Check that it's valid and not expired.";
    case 403:
      return "GitHub refused the request (403). The token likely lacks Contents: read and write on this repo.";
    case 404:
      return `Couldn't find ${ENTRIES_PATH} on ${REPO_OWNER}/${REPO_NAME} (404). A fine-grained token also 404s when it has no access to the repo.`;
    case 409:
      return "The file changed on GitHub while you were editing (409). Try submitting again.";
    case 422:
      return `GitHub rejected the commit (422). ${body}`;
    default:
      return `GitHub returned ${status}. ${body}`;
  }
}

async function request(path: string, init: RequestInit = {}): Promise<Response> {
  const token = loadToken();
  const res = await fetch(`${API_ROOT}${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  if (!res.ok) {
    let detail = "";
    try {
      detail = ((await res.json()) as { message?: string }).message ?? "";
    } catch {
      // non-JSON error body — the status alone is enough
    }
    throw new GitHubError(explain(res.status, detail), res.status);
  }
  return res;
}

interface ContentsResponse {
  content: string;
  sha: string;
}

export interface FetchedEntries {
  entries: EntryInput[];
  sha: string;
}

const contentsUrl = (): string =>
  `/repos/${REPO_OWNER}/${REPO_NAME}/contents/${ENTRIES_PATH}?ref=${DEFAULT_BRANCH}`;

/** Current contents of data/entries.json, plus the blob sha needed to update it. */
export async function fetchEntries(): Promise<FetchedEntries> {
  const res = await request(contentsUrl(), { cache: "no-store" });
  const body = (await res.json()) as ContentsResponse;
  const text = base64ToUtf8(body.content);
  const parsed = JSON.parse(text) as EntryInput[];
  if (!Array.isArray(parsed)) {
    throw new GitHubError(`${ENTRIES_PATH} is not a JSON array.`, 422);
  }
  return { entries: parsed, sha: body.sha };
}

async function putEntries(entries: EntryInput[], sha: string, message: string): Promise<string> {
  const res = await request(`/repos/${REPO_OWNER}/${REPO_NAME}/contents/${ENTRIES_PATH}`, {
    method: "PUT",
    body: JSON.stringify({
      message,
      content: utf8ToBase64(serializeEntries(entries)),
      sha,
      branch: DEFAULT_BRANCH,
    }),
  });
  const body = (await res.json()) as { commit?: { html_url?: string } };
  return body.commit?.html_url ?? `https://github.com/${REPO_OWNER}/${REPO_NAME}`;
}

/**
 * Prepends the entry to data/entries.json and commits. Read-modify-write against
 * a blob sha, so a concurrent commit is retried once rather than clobbering it.
 */
export async function commitEntry(entry: EntryInput): Promise<string> {
  for (let attempt = 0; ; attempt++) {
    const { entries, sha } = await fetchEntries();
    try {
      return await putEntries([entry, ...entries], sha, commitMessage(entry));
    } catch (err) {
      const stale = err instanceof GitHubError && (err.status === 409 || err.status === 422);
      if (!stale || attempt > 0) throw err;
    }
  }
}

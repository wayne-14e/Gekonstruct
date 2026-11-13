import "server-only";

import { z } from "zod";
import type { RepoRef } from "@/lib/pipeline/ingest";

const API_BASE = "https://api.github.com";
const RAW_BASE = "https://raw.githubusercontent.com";
const REQUEST_TIMEOUT_MS = 20_000;

/**
 * A failure the ingest stage can explain to a human. `httpStatus` is what the route
 * returns; the message is what the UI shows verbatim.
 */
export class IngestError extends Error {
  readonly code: string;
  readonly httpStatus: number;

  constructor(message: string, code: string, httpStatus = 502) {
    super(message);
    this.name = "IngestError";
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

const TreeEntrySchema = z.object({
  path: z.string().min(1),
  type: z.enum(["blob", "tree", "commit"]),
  size: z.number().int().nonnegative().optional(),
});

const TreeResponseSchema = z.object({
  tree: z.array(TreeEntrySchema),
  truncated: z.boolean().optional(),
});

export type RepoTree = z.infer<typeof TreeResponseSchema>;

function githubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "gekonstruct",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const token = process.env.GITHUB_TOKEN?.trim();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function get(url: string, headers: Record<string, string>): Promise<Response> {
  try {
    return await fetch(url, {
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new IngestError(
      "GitHub could not be reached. Check your connection and try again.",
      "github-network",
      503,
    );
  }
}

function upstreamError(response: Response): IngestError {
  if (response.status === 404) {
    return new IngestError(
      "We couldn't find that repository. Check that it exists and is public.",
      "repo-not-found",
      404,
    );
  }
  if (response.status === 409) {
    return new IngestError("That repository is empty.", "repo-empty", 422);
  }
  if (response.status === 451) {
    return new IngestError(
      "That repository is unavailable for legal reasons, so we can't read it.",
      "repo-unavailable",
      422,
    );
  }
  if (
    (response.status === 403 || response.status === 429) &&
    (response.status === 429 || response.headers.get("x-ratelimit-remaining") === "0")
  ) {
    return new IngestError(
      "GitHub is rate-limiting anonymous requests right now. Try again in a few minutes.",
      "github-rate-limited",
      503,
    );
  }
  return new IngestError(
    `GitHub returned ${response.status} while reading the repository. Try again in a moment.`,
    "github-error",
    502,
  );
}

/** Default-branch tree, recursively. BLUEPRINT §5 step 1. */
export async function fetchRepoTree(repo: RepoRef): Promise<RepoTree> {
  const url = `${API_BASE}/repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.repo)}/git/trees/HEAD?recursive=1`;
  const response = await get(url, githubHeaders());

  if (!response.ok) throw upstreamError(response);

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    throw new IngestError("GitHub returned a tree we couldn't read. Try again.", "github-bad-json");
  }

  const parsed = TreeResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new IngestError("GitHub returned an unexpected tree for this repository.", "github-bad-tree");
  }

  return parsed.data;
}

/** Raw file from the default branch. Raw does not consume the API rate limit. */
export async function fetchRepoFile(repo: RepoRef, path: string): Promise<string> {
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  const url = `${RAW_BASE}/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.repo)}/HEAD/${encodedPath}`;
  const response = await get(url, { "User-Agent": "gekonstruct" });

  if (response.status === 404) {
    throw new IngestError(
      `GitHub could not return \`${path}\`. The repository may have changed — try again.`,
      "file-missing",
      422,
    );
  }
  if (!response.ok) throw upstreamError(response);

  try {
    return await response.text();
  } catch {
    throw new IngestError(`We couldn't read \`${path}\`. Try again.`, "file-unreadable");
  }
}

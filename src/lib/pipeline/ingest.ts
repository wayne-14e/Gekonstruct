/**
 * Deterministic repository ingestion (BLUEPRINT §5). Everything in this module is pure
 * so the filters, priority order and budgets can be unit-tested without network access.
 */

export const MAX_FILES = 60;
export const MAX_TOTAL_CHARS = 150_000;
export const MAX_FILE_CHARS = 12_000;
export const MAX_FILE_BYTES = 300 * 1024;
export const TRUNCATION_MARKER = "\n// ... [truncated by Gekonstruct] ...\n";

export type RepoRef = { owner: string; repo: string };
export type BlobEntry = { path: string; size: number };
export type SelectedFile = BlobEntry;

export type ExclusionReason = "directory" | "lockfile" | "env" | "binary" | "oversize";

export type FilePriority = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

const REPO_SEGMENT = /^[A-Za-z0-9._-]+$/;

/**
 * Accepts `github.com/owner/repo`, with or without protocol/www and with or without a
 * trailing `.git` or slash. Anything with extra path segments is rejected: a tree URL is
 * not a repository URL, and guessing which branch the user meant would be worse than
 * asking them for the root.
 */
export function parseRepoUrl(raw: string): RepoRef | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return null;

  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (host !== "github.com") return null;

  const segments = url.pathname.split("/").filter(Boolean).map(decodeURIComponent);
  if (segments.length !== 2) return null;

  const [owner, rawRepo] = segments;
  const repo = rawRepo?.replace(/\.git$/i, "");
  if (!owner || !repo) return null;
  if (!REPO_SEGMENT.test(owner) || !REPO_SEGMENT.test(repo)) return null;
  if (owner === "." || owner === ".." || repo === "." || repo === "..") return null;

  return { owner, repo };
}

export function normalizeRepoUrl(ref: RepoRef): string {
  return `https://github.com/${ref.owner}/${ref.repo}`;
}

const EXCLUDED_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  ".nuxt",
  ".svelte-kit",
  "dist",
  "build",
  "coverage",
  ".turbo",
  ".cache",
  ".output",
  ".vercel",
  "out",
]);

const LOCKFILES = new Set([
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "npm-shrinkwrap.json",
  "bun.lockb",
  "bun.lock",
]);

const BINARY_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "avif",
  "svg",
  "ico",
  "mp4",
  "webm",
  "mov",
  "mp3",
  "wav",
  "woff",
  "woff2",
  "ttf",
  "otf",
  "eot",
  "pdf",
  "zip",
]);

const MANIFESTS = new Set([
  "package.json",
  "requirements.txt",
  "pyproject.toml",
  "go.mod",
  "cargo.toml",
]);

function basename(path: string): string {
  const index = path.lastIndexOf("/");
  return index === -1 ? path : path.slice(index + 1);
}

function depth(path: string): number {
  return path.split("/").length;
}

function segments(path: string): string[] {
  return path.split("/");
}

function hasSegment(path: string, values: Set<string>): boolean {
  return segments(path).some((segment) => values.has(segment));
}

function extension(path: string): string {
  const name = basename(path);
  const index = name.lastIndexOf(".");
  return index <= 0 ? "" : name.slice(index + 1).toLowerCase();
}

/** Why a blob is not worth sending to the analyser, or null when it is. */
export function excludedReason(path: string, size: number): ExclusionReason | null {
  const normalized = path.replace(/^\.\//, "");

  if (hasSegment(normalized, EXCLUDED_DIRS)) return "directory";
  if (LOCKFILES.has(basename(normalized).toLowerCase())) return "lockfile";
  if (basename(normalized).startsWith(".env")) return "env";
  if (BINARY_EXTENSIONS.has(extension(normalized))) return "binary";
  if (size > MAX_FILE_BYTES) return "oversize";

  return null;
}

const ROOT_LAYOUT = /(^|\/)(src\/)?app\/layout\.(tsx|ts|jsx|js)$/;
const APP_PAGE_FILE = /^page\.(tsx|ts|jsx|js)$/;
const APP_ROUTE_FILE = /^route\.(tsx|ts)$/;
const NEXT_CONFIG = /^next\.config\.(ts|js|mjs|cjs)$/;
const TAILWIND_CONFIG = /^tailwind\.config\.(ts|js|mjs|cjs)$/;
const VITE_CONFIG = /^vite\.config\.(ts|js|mjs|cjs)$/;
const CONFIG_FILES = new Set([
  "tsconfig.json",
  "firebase.json",
  "vercel.json",
  "supabase/config.toml",
]);
const ROUTE_DIRS = new Set(["pages"]);
const LIB_DIRS = new Set(["lib", "services", "api", "utils", "hooks", "store"]);
const SOURCE_EXTENSIONS = new Set(["ts", "tsx", "js", "jsx", "mjs", "cjs"]);

function isSource(path: string): boolean {
  return SOURCE_EXTENSIONS.has(extension(path));
}

function isRootLayout(path: string): boolean {
  return ROOT_LAYOUT.test(path);
}

function isComponent(path: string): boolean {
  return hasSegment(path, new Set(["components"])) && isSource(path);
}

function isSupabaseMigration(path: string): boolean {
  return /(^|\/)supabase\/migrations\/[^/]+\.sql$/.test(path);
}

/**
 * BLUEPRINT §5 priority order. Lower numbers are read first; `7` covers the root layout
 * plus the five largest component files (selection is handled in `selectSnapshotFiles`).
 */
export function filePriority(path: string): FilePriority {
  const name = basename(path).toLowerCase();
  const full = path.toLowerCase();

  if (MANIFESTS.has(name)) return 1;
  if (CONFIG_FILES.has(full) || NEXT_CONFIG.test(name) || TAILWIND_CONFIG.test(name) || VITE_CONFIG.test(name)) {
    return 2;
  }
  if (
    (APP_PAGE_FILE.test(name) && hasSegment(full, new Set(["app"]))) ||
    (APP_ROUTE_FILE.test(name) && hasSegment(full, new Set(["app"]))) ||
    hasSegment(full, ROUTE_DIRS) ||
    /(^|\/)src\/main\./.test(full) ||
    /(^|\/)server\.(ts|tsx|js|jsx|py|go|rs)$/.test(full) ||
    /(^|\/)index\.(ts|tsx|js|jsx|py|go|rs)$/.test(full)
  ) {
    return 3;
  }
  if (
    full === "prisma/schema.prisma" ||
    full.endsWith("/prisma/schema.prisma") ||
    hasSegment(full, new Set(["drizzle"])) ||
    isSupabaseMigration(full) ||
    name === "schema.sql"
  ) {
    return 4;
  }
  if (hasSegment(full, LIB_DIRS)) return 5;
  if (name === "readme.md") return 6;
  if (isRootLayout(path) || isComponent(path)) return 7;

  return 8;
}

/** Shallowest first, then largest, then path — stable and deterministic. */
function compareFiles(a: BlobEntry, b: BlobEntry): number {
  return depth(a.path) - depth(b.path) || b.size - a.size || a.path.localeCompare(b.path);
}

/**
 * Choose the files that fit the snapshot budget. Manifests and config come first, then
 * entry points, schema, library code and the README; components contribute the root
 * layout plus their five largest files; whatever is left is filled by shallowest source
 * files. Selection stops as soon as 60 files or 150k characters would be exceeded.
 */
export function selectSnapshotFiles(entries: BlobEntry[]): SelectedFile[] {
  const unique = new Map<string, BlobEntry>();
  for (const entry of entries) {
    if (!unique.has(entry.path)) unique.set(entry.path, entry);
  }

  const candidates = [...unique.values()].filter((entry) => excludedReason(entry.path, entry.size) === null);
  const selected: SelectedFile[] = [];
  const chosen = new Set<string>();
  let chars = 0;
  let migrationCount = 0;

  type AddOutcome = "added" | "skipped" | "full";

  const add = (entry: BlobEntry): AddOutcome => {
    if (chosen.has(entry.path)) return "skipped";
    if (selected.length >= MAX_FILES) return "full";

    const cost = Math.min(entry.size, MAX_FILE_CHARS);
    if (chars + cost > MAX_TOTAL_CHARS) return "full";

    if (isSupabaseMigration(entry.path)) {
      if (migrationCount >= 2) return "skipped";
      migrationCount += 1;
    }

    selected.push(entry);
    chosen.add(entry.path);
    chars += cost;
    return "added";
  };

  const grouped = new Map<FilePriority, BlobEntry[]>();
  for (const entry of candidates) {
    const priority = filePriority(entry.path);
    const bucket = grouped.get(priority);
    if (bucket) bucket.push(entry);
    else grouped.set(priority, [entry]);
  }

  for (const priority of [1, 2, 3, 4, 5, 6] as const) {
    const bucket = grouped.get(priority);
    if (!bucket) continue;
    for (const entry of bucket.sort(compareFiles)) {
      if (add(entry) === "full") return selected;
    }
  }

  const componentFiles = grouped.get(7) ?? [];
  const rootLayouts = componentFiles.filter((entry) => isRootLayout(entry.path)).sort(compareFiles);
  const components = componentFiles
    .filter((entry) => !isRootLayout(entry.path))
    .sort((a, b) => b.size - a.size || a.path.localeCompare(b.path))
    .slice(0, 5);

  for (const entry of [...rootLayouts, ...components]) {
    if (add(entry) === "full") return selected;
  }

  const rest = (grouped.get(8) ?? []).sort(compareFiles);
  for (const entry of rest) {
    if (add(entry) === "full") return selected;
  }

  return selected;
}

/**
 * Keep the head and tail of oversized files, replacing the middle with a visible marker.
 * The stored string never exceeds `maxChars` characters, marker included.
 */
export function truncateContent(
  content: string,
  maxChars: number = MAX_FILE_CHARS,
): { content: string; truncated: boolean } {
  if (content.length <= maxChars) return { content, truncated: false };

  const budget = Math.max(0, maxChars - TRUNCATION_MARKER.length);
  const headLength = Math.ceil(budget * 0.6);
  const tailLength = budget - headLength;

  return {
    content: content.slice(0, headLength) + TRUNCATION_MARKER + content.slice(content.length - tailLength),
    truncated: true,
  };
}

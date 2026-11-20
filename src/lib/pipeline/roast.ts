import { RepoRoastSchema, type RepoRoast } from "@/lib/domain/repo-roast";

export { RepoRoastSchema };
export type { RepoRoast };

function isOneSentence(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || /[\n\r]/.test(trimmed)) return false;
  const words = trimmed.split(/\s+/).length;
  if (words < 8 || words > 30) return false;
  const sentenceEndings = trimmed.match(/[.!?](?:["')\]]*)?$/g);
  if (!sentenceEndings) return false;
  const internalEndings = trimmed
    .slice(0, -1)
    .match(/[.!?](?:["')\]]*)?(?=\s|$)/g);
  return !internalEndings || internalEndings.length === 0;
}

export function normalizeRepoRoast(
  raw: unknown,
  allowedPaths: readonly string[],
): { ok: true; value: RepoRoast } | { ok: false; problems: string[] } {
  const parsed = RepoRoastSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      problems: parsed.error.issues.slice(0, 10).map((issue) => issue.message),
    };
  }

  const problems: string[] = [];
  if (!isOneSentence(parsed.data.quote)) {
    problems.push("quote must be exactly one sentence with 8-30 words.");
  }
  if (!allowedPaths.includes(parsed.data.file)) {
    problems.push(`file "${parsed.data.file}" is not in the repository snapshot.`);
  }
  if (parsed.data.quote.includes(parsed.data.file)) {
    problems.push("quote must not repeat the separate file reference.");
  }

  return problems.length > 0
    ? { ok: false, problems }
    : { ok: true, value: parsed.data };
}

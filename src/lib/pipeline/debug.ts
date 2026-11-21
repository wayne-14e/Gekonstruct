import {
  DEBUG_LIMITS,
  DebugModelSchema,
  type DataPathStep,
  type DebugModel,
  type DebugSessionContent,
  type LikelyCause,
} from "@/lib/domain/debug";
import type { QuizQuestion } from "@/lib/domain/lesson";
import type { SnapshotFile } from "@/lib/domain/project";

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; problems: string[] };

/**
 * Pure keyword overlap matcher (BLUEPRINT §6).
 *
 * Scores snapshot files against words and identifiers in the user's symptom text.
 * Heavy weight for path matches, bounded frequency weight for content matches.
 * Falls back to highest-priority snapshot files if no keyword matches exist.
 */
const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "been",
  "being",
  "broken",
  "bug",
  "but",
  "by",
  "can",
  "could",
  "did",
  "do",
  "does",
  "error",
  "failed",
  "failing",
  "fails",
  "for",
  "from",
  "had",
  "has",
  "have",
  "her",
  "him",
  "his",
  "how",
  "i",
  "if",
  "in",
  "is",
  "issue",
  "it",
  "its",
  "me",
  "my",
  "no",
  "not",
  "of",
  "on",
  "or",
  "our",
  "problem",
  "should",
  "so",
  "that",
  "the",
  "their",
  "them",
  "then",
  "there",
  "these",
  "they",
  "this",
  "those",
  "to",
  "us",
  "was",
  "we",
  "were",
  "what",
  "when",
  "where",
  "which",
  "who",
  "why",
  "will",
  "with",
  "would",
  "you",
  "your",
]);

export function extractSymptomKeywords(symptom: string): string[] {
  // Extract word tokens, path tokens, and dotted identifiers (e.g. `auth.ts`, `session.user`)
  const matches = symptom.match(/[A-Za-z0-9_./-]+/g) ?? [];
  const unique = new Set<string>();

  for (const raw of matches) {
    const cleaned = raw.replace(/^[/.-]+|[/.-]+$/g, "").toLowerCase();
    if (cleaned.length >= 2 && !STOP_WORDS.has(cleaned)) {
      unique.add(cleaned);
    }
  }

  return Array.from(unique);
}

export function matchFilesBySymptom(
  files: SnapshotFile[],
  symptom: string,
  limit = 10,
): SnapshotFile[] {
  if (files.length <= limit) {
    return files;
  }

  const keywords = extractSymptomKeywords(symptom);

  if (keywords.length === 0) {
    return files.slice(0, limit);
  }

  const scored: Array<{ file: SnapshotFile; score: number }> = [];

  for (const file of files) {
    const pathLower = file.path.toLowerCase();
    const contentLower = file.content.toLowerCase();
    let score = 0;

    for (const kw of keywords) {
      // Exact path segment or basename match (+20)
      if (pathLower.endsWith(`/${kw}`) || pathLower === kw || pathLower.includes(`/${kw}.`)) {
        score += 20;
      } else if (pathLower.includes(kw)) {
        score += 10;
      }

      // Content match: count occurrences (up to 5 occurrences @ 2 pts each = +10 max per kw)
      let count = 0;
      let pos = 0;
      while ((pos = contentLower.indexOf(kw, pos)) !== -1 && count < 5) {
        count += 1;
        pos += kw.length;
      }
      score += count * 2;
    }

    if (score > 0) {
      scored.push({ file, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);

  const matched = scored.slice(0, limit).map((s) => s.file);

  if (matched.length < limit) {
    const chosenPaths = new Set(matched.map((f) => f.path));
    for (const file of files) {
      if (!chosenPaths.has(file.path)) {
        matched.push(file);
        chosenPaths.add(file.path);
        if (matched.length >= limit) break;
      }
    }
  }

  return matched;
}

/** Looks like a file path: has an extension or a path separator. */
function isPathLike(token: string): boolean {
  const trimmed = token.replace(/^[./]+/, "").replace(/[),:;.!?]+$/, "");
  return /\.(?:[a-z0-9]{1,6})$/i.test(trimmed) || trimmed.includes("/");
}

function cleanPathToken(token: string): string {
  return token.replace(/^[./]+/, "").replace(/[),:;.!?]+$/, "").trim();
}

function extractBacktickedPaths(text: string): string[] {
  const matches = text.match(/`([^`\n]+)`/g) ?? [];
  return matches
    .map((match) => cleanPathToken(match.slice(1, -1)))
    .filter(isPathLike);
}

export function normalizeDebugOutput(
  raw: unknown,
  allowedPaths: Set<string>,
): ValidationResult<DebugSessionContent> {
  const parsed = DebugModelSchema.safeParse(raw);
  if (!parsed.success) {
    const problems = parsed.error.issues.map(
      (issue) => `${issue.path.join(".") || "root"}: ${issue.message}`,
    );
    return { ok: false, problems };
  }

  const model: DebugModel = parsed.data;
  const problems: string[] = [];

  // 1. Audit likelyCauses
  const causes: LikelyCause[] = [];
  for (let i = 0; i < model.likelyCauses.length; i += 1) {
    const cause = model.likelyCauses[i];
    const validEvidence: string[] = [];

    for (const file of cause.evidenceFiles) {
      const cleaned = cleanPathToken(file);
      if (allowedPaths.has(cleaned)) {
        if (!validEvidence.includes(cleaned)) {
          validEvidence.push(cleaned);
        }
      } else {
        problems.push(
          `likelyCauses[${i}].evidenceFiles cites "${file}", which is not in this repository's snapshot.`,
        );
      }
    }

    // Check backticked paths in cause text
    for (const cited of extractBacktickedPaths(cause.cause)) {
      if (!allowedPaths.has(cited)) {
        problems.push(
          `likelyCauses[${i}].cause mentions "${cited}", which is not in this repository's snapshot.`,
        );
      }
    }

    if (validEvidence.length > 0) {
      causes.push({
        cause: cause.cause,
        evidenceFiles: validEvidence,
        confidence: cause.confidence,
      });
    }
  }

  if (causes.length < DEBUG_LIMITS.likelyCauses.min) {
    problems.push(
      `Provide at least ${DEBUG_LIMITS.likelyCauses.min} likely causes, each with real evidence files from the snapshot.`,
    );
  }

  const clampedCauses = causes.slice(0, DEBUG_LIMITS.likelyCauses.max);

  // 2. Audit fixSteps
  const fixSteps: string[] = [];
  for (let i = 0; i < model.fixSteps.length; i += 1) {
    const step = model.fixSteps[i];
    for (const cited of extractBacktickedPaths(step)) {
      if (!allowedPaths.has(cited)) {
        problems.push(
          `fixSteps[${i}] mentions "${cited}", which is not in this repository's snapshot.`,
        );
      }
    }
    fixSteps.push(step);
  }

  if (fixSteps.length < DEBUG_LIMITS.fixSteps.min) {
    problems.push(`Provide at least ${DEBUG_LIMITS.fixSteps.min} concrete fix steps.`);
  }

  const clampedFixSteps = fixSteps.slice(0, DEBUG_LIMITS.fixSteps.max);

  // 3. Audit dataPath: every hop must land on a real file, and the trace must
  // actually move between components instead of restating one file.
  const dataSteps: DataPathStep[] = [];
  for (let i = 0; i < model.dataPath.steps.length; i += 1) {
    const step = model.dataPath.steps[i];
    const cleaned = cleanPathToken(step.file);

    if (!allowedPaths.has(cleaned)) {
      problems.push(
        `dataPath.steps[${i}].file cites "${step.file}", which is not in this repository's snapshot.`,
      );
      continue;
    }

    for (const cited of extractBacktickedPaths(step.whatHappens)) {
      if (!allowedPaths.has(cited)) {
        problems.push(
          `dataPath.steps[${i}].whatHappens mentions "${cited}", which is not in this repository's snapshot.`,
        );
      }
    }

    dataSteps.push({ ...step, file: cleaned });
  }

  for (const field of ["entry", "breaksAt"] as const) {
    for (const cited of extractBacktickedPaths(model.dataPath[field])) {
      if (!allowedPaths.has(cited)) {
        problems.push(
          `dataPath.${field} mentions "${cited}", which is not in this repository's snapshot.`,
        );
      }
    }
  }

  if (dataSteps.length < DEBUG_LIMITS.dataPath.min) {
    problems.push(
      `Provide at least ${DEBUG_LIMITS.dataPath.min} data path hops, each on a real file from the snapshot.`,
    );
  }

  const distinctDataFiles = new Set(dataSteps.map((step) => step.file));
  if (
    dataSteps.length >= DEBUG_LIMITS.dataPath.min &&
    distinctDataFiles.size < DEBUG_LIMITS.dataPath.distinctFiles
  ) {
    problems.push(
      `The data path must cross at least ${DEBUG_LIMITS.dataPath.distinctFiles} distinct files.`,
    );
  }

  const clampedDataPath = {
    entry: model.dataPath.entry,
    steps: dataSteps.slice(0, DEBUG_LIMITS.dataPath.max),
    breaksAt: model.dataPath.breaksAt,
  };

  // 4. Audit whyItWorks
  for (const cited of extractBacktickedPaths(model.whyItWorks.explanation)) {
    if (!allowedPaths.has(cited)) {
      problems.push(
        `whyItWorks.explanation mentions "${cited}", which is not in this repository's snapshot.`,
      );
    }
  }

  // 5. Audit quiz
  const validatedQuiz: QuizQuestion[] = [];
  for (let i = 0; i < model.quiz.length; i += 1) {
    const q = model.quiz[i];
    if (q.options.length < DEBUG_LIMITS.options.min || q.options.length > DEBUG_LIMITS.options.max) {
      problems.push(`quiz[${i}].options must contain 3 or 4 options.`);
    }
    if (q.correctIndex < 0 || q.correctIndex >= q.options.length) {
      problems.push(`quiz[${i}].correctIndex must point to an option.`);
    }
    const uniqueOptions = new Set(q.options.map((opt) => opt.trim().toLowerCase()));
    if (uniqueOptions.size !== q.options.length) {
      problems.push(`quiz[${i}].options must all be distinct.`);
    }
    validatedQuiz.push(q);
  }

  if (validatedQuiz.length < DEBUG_LIMITS.quiz.min) {
    problems.push(`Provide at least ${DEBUG_LIMITS.quiz.min} quiz question.`);
  }

  const clampedQuiz = validatedQuiz.slice(0, DEBUG_LIMITS.quiz.max);

  // 6. Audit gekoTip
  for (const cited of extractBacktickedPaths(model.gekoTip)) {
    if (!allowedPaths.has(cited)) {
      problems.push(`gekoTip mentions "${cited}", which is not in this repository's snapshot.`);
    }
  }

  if (problems.length > 0) {
    return { ok: false, problems };
  }

  return {
    ok: true,
    value: {
      likelyCauses: clampedCauses,
      fixSteps: clampedFixSteps,
      dataPath: clampedDataPath,
      whyItWorks: model.whyItWorks,
      quiz: clampedQuiz,
      gekoTip: model.gekoTip,
      xp: DEBUG_LIMITS.xp,
    },
  };
}

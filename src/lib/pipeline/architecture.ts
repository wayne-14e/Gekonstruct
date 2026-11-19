/**
 * Deterministic half of the architecture stage (BLUEPRINT §6). Model output is checked
 * against the actual snapshot before it can reach Firestore or the UI:
 *
 * - every `files` entry must be a path that exists in the snapshot (unknown paths are
 *   dropped, never rendered as if they were real)
 * - any path the prose cites must also exist; invented paths are a hard validation error
 * - counts are clamped to the blueprint ranges instead of forcing a repair round-trip
 *
 * Missing prose citations are recorded as soft warnings (each item still ships with real
 * file chips). Hard problems go back to the model for exactly one repair attempt.
 */
import {
  ARCHITECTURE_LIMITS,
  ArchitectureModelSchema,
  type Architecture,
} from "@/lib/domain/architecture";

export type ArchitectureProblem = string;

export type ArchitectureNormalization =
  | {
      ok: true;
      value: Architecture;
      droppedFileRefs: string[];
      trimmedCounts: string[];
      softWarnings: string[];
    }
  | { ok: false; problems: ArchitectureProblem[]; droppedFileRefs: string[] };

function normalizePath(path: string): string {
  const trimmed = path.trim();
  return trimmed.startsWith("./") ? trimmed.slice(2) : trimmed;
}

export function slugify(raw: string): string {
  const slug = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || "item";
}

export function uniqueId(base: string, used: Set<string>): string {
  let candidate = base;
  let suffix = 2;
  while (used.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  used.add(candidate);
  return candidate;
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** True when `text` literally contains one of the snapshot paths. */
export function mentionsRealPath(text: string, allowedPaths: ReadonlySet<string>): boolean {
  for (const path of allowedPaths) {
    if (text.includes(path)) return true;
  }
  return false;
}

export function directoryIndex(paths: ReadonlySet<string>): Set<string> {
  const dirs = new Set<string>();
  for (const path of paths) {
    const segments = path.split("/");
    for (let length = 1; length < segments.length; length += 1) {
      dirs.add(segments.slice(0, length).join("/"));
    }
  }
  return dirs;
}

/**
 * Every backticked token that looks like a file path must be in the snapshot. Routes
 * (`/api/...`), climbs (`../`), package names, globs and URL/code fragments are ignored:
 * this check exists to catch invented files, not to police prose.
 */
export function inventedPathMentions(
  text: string,
  allowedPaths: ReadonlySet<string>,
  dirs: ReadonlySet<string>,
): string[] {
  const found = new Set<string>();

  for (const match of text.matchAll(/`([^`]+)`/g)) {
    const raw = normalizePath(match[1] ?? "")
      .replace(/:\d+(?:-\d+)?$/, "")
      .replace(/[),.;:]+$/, "")
      .trim();

    if (!raw) continue;
    if (raw.startsWith("/") || raw.startsWith("@") || raw.startsWith("..")) continue;
    // CSS selectors/classes (`.card`), custom properties (`--primary`) and dotfiles are
    // not file paths in the sense this check cares about.
    if (raw.startsWith(".") || raw.startsWith("-")) continue;
    if (/^[a-z]+:\/\//i.test(raw)) continue;
    if (/[\s{}=*<>|]/.test(raw)) continue;
    if (!(raw.includes("/") || /\.[a-z0-9]{1,6}$/i.test(raw))) continue;

    if (allowedPaths.has(raw) || dirs.has(raw)) continue;
    found.add(raw);
  }

  return [...found];
}

function filterFiles(
  files: string[],
  allowed: ReadonlySet<string>,
  dropped: Set<string>,
): string[] {
  const kept: string[] = [];
  for (const raw of files) {
    const path = normalizePath(raw);
    if (!allowed.has(path)) {
      dropped.add(path);
      continue;
    }
    if (!kept.includes(path)) kept.push(path);
  }
  return kept.slice(0, ARCHITECTURE_LIMITS.filesPerItem.max);
}

function sanitizeMermaid(value: string | null | undefined): string | null {
  if (!value) return null;

  const source = value
    .replace(/^```(?:mermaid)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();

  if (!source || source.length > ARCHITECTURE_LIMITS.mermaidChars) return null;
  if (!/^(flowchart|graph)\s+(LR|RL|TB|BT|TD)\b/i.test(source)) return null;
  return source;
}

export function normalizeArchitecture(
  raw: unknown,
  allowedPaths: string[],
): ArchitectureNormalization {
  const allowed = new Set(allowedPaths.map(normalizePath));
  const dirs = directoryIndex(allowed);
  const dropped = new Set<string>();
  const trimmedCounts: string[] = [];
  const softWarnings: string[] = [];

  const parsed = ArchitectureModelSchema.safeParse(raw);
  if (!parsed.success) {
    const problems = parsed.error.issues.slice(0, 10).map((issue) => {
      const where = issue.path.length > 0 ? issue.path.join(".") : "root";
      return `${where}: ${issue.message}`;
    });
    return { ok: false, problems, droppedFileRefs: [] };
  }

  const model = parsed.data;
  const problems: ArchitectureProblem[] = [];

  const pathProblems = (label: string, texts: string[]) => {
    for (const path of inventedPathMentions(texts.join("\n"), allowed, dirs)) {
      problems.push(`${label}: "${path}" is not a file in this repository.`);
    }
  };

  pathProblems("summary", [
    model.summary.whatItDoes,
    model.summary.plainSummary,
    model.summary.gekoIntro,
  ]);

  const layerIds = new Set<string>();
  const layers = model.architecture.layers.map((layer) => {
    const files = filterFiles(layer.files, allowed, dropped);
    if (files.length === 0) {
      problems.push(
        `layers["${layer.name}"].files: none of the listed paths exist in the repository.`,
      );
    }
    pathProblems(`layers["${layer.name}"]`, [layer.purpose, layer.plainExplanation]);
    if (!mentionsRealPath(`${layer.purpose} ${layer.plainExplanation}`, allowed)) {
      softWarnings.push(`layers["${layer.name}"]: no path cited in prose.`);
    }
    return { ...layer, id: uniqueId(slugify(layer.id || layer.name), layerIds), files };
  });

  if (layers.length < ARCHITECTURE_LIMITS.layers.min) {
    problems.push(
      `architecture.layers: ${layers.length} item(s); the blueprint requires at least ${ARCHITECTURE_LIMITS.layers.min}.`,
    );
  }

  const flowSteps = model.architecture.dataFlow.map((step) => ({ ...step }));
  if (flowSteps.length < ARCHITECTURE_LIMITS.dataFlow.min) {
    problems.push(
      `architecture.dataFlow: ${flowSteps.length} step(s); the blueprint requires at least ${ARCHITECTURE_LIMITS.dataFlow.min}.`,
    );
  }
  pathProblems("architecture.dataFlow", flowSteps.map((step) => step.whatHappens));
  if (!flowSteps.some((step) => mentionsRealPath(step.whatHappens, allowed))) {
    softWarnings.push("architecture.dataFlow: no step cites a path in prose.");
  }

  const conceptIds = new Set<string>();
  const concepts = model.concepts.map((concept) => {
    const files = filterFiles(concept.files, allowed, dropped);
    if (files.length === 0) {
      problems.push(
        `concepts["${concept.term}"].files: none of the listed paths exist in the repository.`,
      );
    }
    pathProblems(`concepts["${concept.term}"]`, [concept.plainDefinition, concept.whyItMatters]);
    if (!mentionsRealPath(`${concept.plainDefinition} ${concept.whyItMatters}`, allowed)) {
      softWarnings.push(`concepts["${concept.term}"]: no path cited in prose.`);
    }
    return { ...concept, id: uniqueId(slugify(concept.id || concept.term), conceptIds), files };
  });

  if (concepts.length < ARCHITECTURE_LIMITS.concepts.min) {
    problems.push(
      `concepts: ${concepts.length} item(s); the blueprint requires at least ${ARCHITECTURE_LIMITS.concepts.min}.`,
    );
  }

  const summaryWords = countWords(model.summary.plainSummary);
  if (summaryWords > ARCHITECTURE_LIMITS.plainSummaryWords) {
    problems.push(
      `summary.plainSummary: ${summaryWords} words; keep it at ${ARCHITECTURE_LIMITS.plainSummaryWords} or fewer.`,
    );
  }

  if (problems.length > 0) {
    return { ok: false, problems, droppedFileRefs: [...dropped] };
  }

  if (layers.length > ARCHITECTURE_LIMITS.layers.max) {
    trimmedCounts.push(`layers ${layers.length} → ${ARCHITECTURE_LIMITS.layers.max}`);
  }
  if (flowSteps.length > ARCHITECTURE_LIMITS.dataFlow.max) {
    trimmedCounts.push(`dataFlow ${flowSteps.length} → ${ARCHITECTURE_LIMITS.dataFlow.max}`);
  }
  if (concepts.length > ARCHITECTURE_LIMITS.concepts.max) {
    trimmedCounts.push(`concepts ${concepts.length} → ${ARCHITECTURE_LIMITS.concepts.max}`);
  }

  const value: Architecture = {
    summary: model.summary,
    architecture: {
      layers: layers.slice(0, ARCHITECTURE_LIMITS.layers.max),
      dataFlow: flowSteps.slice(0, ARCHITECTURE_LIMITS.dataFlow.max),
      mermaid: sanitizeMermaid(model.architecture.mermaid),
    },
    concepts: concepts.slice(0, ARCHITECTURE_LIMITS.concepts.max),
  };

  const finalCheck = ArchitectureModelSchema.safeParse(value);
  if (!finalCheck.success) {
    return {
      ok: false,
      problems: finalCheck.error.issues.map((issue) => issue.message),
      droppedFileRefs: [...dropped],
    };
  }

  return { ok: true, value, droppedFileRefs: [...dropped], trimmedCounts, softWarnings };
}

/** Short, human-readable list of every path the UI may show. Used by tests too. */
export function realPathsFromSnapshot(files: Array<{ path: string }>): string[] {
  return files.map((file) => file.path);
}

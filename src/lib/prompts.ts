import type { SnapshotFile, Stack } from "@/lib/domain/project";
import { ARCHITECTURE_LIMITS } from "@/lib/domain/architecture";

/**
 * Every prompt template lives here (AGENTS §5). A prompt change = bump the version
 * constant + update PROJECT_CONTEXT.md → Prompts + a Decisions Log entry.
 */

export const ARCHITECTURE_PROMPT_VERSION = "architecture-v1";

/**
 * Voice rules shared by every stage. BLUEPRINT §6 + §10: plain English, short sentences,
 * real file paths, no generic tutorial prose, no hype.
 */
const VOICE_RULES = `Voice rules for every human-readable field:
- Plain English. Short sentences. Never use jargon without a one-clause explanation.
- Every explanation must point at a real file path from ALLOWED FILE PATHS, written in backticks exactly as listed.
- Talk about THIS repository only. No generic tutorial content, no imagined features.
- If something is uncertain, say what is uncertain instead of inventing files or behaviour.
- No emojis, no hype words, no markdown headings, no code fences inside strings.`;

export const ARCHITECTURE_SYSTEM_PROMPT = `You are Gekonstruct's analysis engine. You turn a codebase into a teaching guidebook for the person who built it with AI but never learned to read it.

${VOICE_RULES}

Return only the JSON object. No prose before or after it.`;

const STACK_LABELS: Array<[keyof Stack, string]> = [
  ["framework", "framework"],
  ["language", "language"],
  ["uiLib", "ui library"],
  ["backend", "backend"],
  ["db", "database"],
  ["auth", "auth"],
  ["hosting", "hosting"],
];

export const MAX_PROMPT_FILE_CHARS = 150_000;

export function buildArchitectureUserPrompt(input: {
  owner: string;
  repo: string;
  stack: Stack | null;
  files: SnapshotFile[];
}): { prompt: string; includedFiles: number; includedChars: number } {
  const stackLines = input.stack
    ? STACK_LABELS.flatMap(([key, label]) => {
        const value = input.stack?.[key];
        return value ? [`- ${label}: ${value}`] : [];
      })
    : [];

  const paths = input.files.map((file) => file.path);
  const pathList = paths.map((path) => `- ${path}`).join("\n");

  const contents: string[] = [];
  let includedChars = 0;
  let includedFiles = 0;
  const skipped: string[] = [];

  for (const file of input.files) {
    if (includedChars + file.content.length > MAX_PROMPT_FILE_CHARS) {
      skipped.push(file.path);
      continue;
    }
    contents.push(`### ${file.path}\n${file.content}`);
    includedChars += file.content.length;
    includedFiles += 1;
  }

  const skippedLine =
    skipped.length > 0
      ? `\n${skipped.length} file(s) were left out to fit the budget: ${skipped.join(", ")}. Do not cite them as code you read.`
      : "";

  const prompt = `PROJECT: ${input.owner}/${input.repo}

DETECTED STACK
${stackLines.length > 0 ? stackLines.join("\n") : "- unknown"}

ALLOWED FILE PATHS (the only paths you may put in "files" or mention in prose)
${pathList}

FILE CONTENTS
${contents.join("\n\n")}${skippedLine}

TASK
Explain this repository's architecture to its own builder. Return one JSON object with exactly these keys:

{
  "summary": {
    "whatItDoes": "2-3 sentences about the product this repo builds.",
    "plainSummary": "One ELI5 paragraph, at most ${ARCHITECTURE_LIMITS.plainSummaryWords} words, that a non-engineer understands.",
    "gekoIntro": "1-2 warm sentences in Geko's voice: a curious chameleon mentor. Point at one real file."
  },
  "architecture": {
    "layers": [
      {
        "id": "short-kebab-case-slug",
        "name": "Layer name",
        "purpose": "One sentence: what this layer is responsible for.",
        "files": ["real/path/from/the/list.ts"],
        "plainExplanation": "2-4 sentences about how THIS layer works in THIS repo. Mention at least one real path in backticks."
      }
    ],
    "dataFlow": [
      { "from": "where it starts", "to": "where it goes", "whatHappens": "1-3 sentences naming real files." }
    ],
    "mermaid": "optional flowchart LR source using only real file or layer names, or null"
  },
  "concepts": [
    {
      "id": "short-kebab-case-slug",
      "term": "Concept the builder must know here",
      "plainDefinition": "What it means, in plain English, grounded in this repo.",
      "files": ["real/path/from/the/list.ts"],
      "whyItMatters": "Why this concept matters for changing THIS project."
    }
  ]
}

HARD CONSTRAINTS
- layers: ${ARCHITECTURE_LIMITS.layers.min}-${ARCHITECTURE_LIMITS.layers.max} items, ordered from the outside in (what a user touches, then the server, then storage).
- dataFlow: ${ARCHITECTURE_LIMITS.dataFlow.min}-${ARCHITECTURE_LIMITS.dataFlow.max} ordered steps for one real request or render in this repo.
- concepts: ${ARCHITECTURE_LIMITS.concepts.min}-${ARCHITECTURE_LIMITS.concepts.max} items, each a term this codebase actually depends on.
- Every "files" array must contain 1-4 real paths copied exactly from ALLOWED FILE PATHS.
- Every layer must name at least one allowed path in backticks inside "purpose" or "plainExplanation".
- Every concept must name at least one allowed path in backticks inside "plainDefinition" or "whyItMatters".
- At least one dataFlow step's "whatHappens" must name a real allowed path in backticks.
- Never cite a path that is not in ALLOWED FILE PATHS. Never invent files.
- ids must be lowercase kebab-case and unique within their list.`;

  return { prompt, includedFiles, includedChars };
}

import type { GuidebookDoc } from "@/lib/domain/architecture";
import type { LessonDoc, Part } from "@/lib/domain/lesson";
import { lessonPartLimits } from "@/lib/domain/lesson";
import type { SnapshotFile, Stack } from "@/lib/domain/project";
import { ARCHITECTURE_LIMITS } from "@/lib/domain/architecture";

/**
 * Every prompt template lives here (AGENTS §5). A prompt change = bump the version
 * constant + update PROJECT_CONTEXT.md → Prompts + a Decisions Log entry.
 */

export const ARCHITECTURE_PROMPT_VERSION = "architecture-v1";
export const LESSONS_PROMPT_VERSION = "lessons-v1";

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

/** Lessons share the architecture snapshot, with a slightly smaller budget per call. */
export const MAX_LESSON_FILE_CHARS = 120_000;

export const LESSONS_SYSTEM_PROMPT = `You are Gekonstruct's lesson writer. You turn a codebase into the Foundations pathway: ordered lessons that teach the person who built the project with AI how to read and change it safely.

${VOICE_RULES}

The pathway must feel like one course about THIS repo, not a stack of unrelated articles. Later lessons may assume earlier ones were read.

Return only the JSON object. No prose before or after it.`;

export type LessonsPromptInput = {
  owner: string;
  repo: string;
  part: Part;
  stack: Stack | null;
  guidebook: GuidebookDoc;
  files: SnapshotFile[];
  existingLessons: LessonDoc[];
};

function mapSummary(guidebook: GuidebookDoc): string {
  const layers = guidebook.architecture.layers
    .map((layer) => `- ${layer.name}: ${layer.purpose} (files: ${layer.files.join(", ")})`)
    .join("\n");
  const concepts = guidebook.concepts
    .map((concept) => `- ${concept.term}: ${concept.whyItMatters} (files: ${concept.files.join(", ")})`)
    .join("\n");

  return `SUMMARY
${guidebook.summary.whatItDoes}

PLAIN SUMMARY
${guidebook.summary.plainSummary}

LAYERS
${layers}

CONCEPTS
${concepts}`;
}

export function buildLessonsUserPrompt(input: LessonsPromptInput): {
  prompt: string;
  includedFiles: number;
  includedChars: number;
  allowedCount: { min: number; max: number };
} {
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
    if (includedChars + file.content.length > MAX_LESSON_FILE_CHARS) {
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

  const existingCount = input.existingLessons.length;
  const allowedCount = lessonPartLimits(input.part, existingCount);

  const existing =
    input.part === 2
      ? input.existingLessons
          .map(
            (lesson) =>
              `${String(lesson.order).padStart(2, "0")}. ${lesson.title} — ${lesson.goal} (id: ${lesson.id})`,
          )
          .join("\n")
      : "";

  const partTask =
    input.part === 1
      ? `Write PART 1 of 2: ${allowedCount.min}-${allowedCount.max} lessons that begin this pathway. Cover the first part of the order below and stop at a natural point; part 2 finishes the pathway.`
      : `Write PART 2 of 2: ${allowedCount.min}-${allowedCount.max} lessons that finish this pathway. ${existingCount} lesson(s) already exist (listed below). Do not repeat them; continue their order. The finished pathway must contain ${allowedCount.min + existingCount}-${allowedCount.max + existingCount} lessons, and the LAST lesson must be "how to debug here".`;

  const existingBlock =
    input.part === 2
      ? `\nLESSONS ALREADY WRITTEN (continue after these; do not repeat them or reuse their ids)\n${existing}`
      : "";

  const prompt = `PROJECT: ${input.owner}/${input.repo}

DETECTED STACK
${stackLines.length > 0 ? stackLines.join("\n") : "- unknown"}

THE ARCHITECTURE MAP ALREADY WRITTEN FOR THIS REPO
${mapSummary(input.guidebook)}
${existingBlock}

ALLOWED FILE PATHS (the only paths you may put in codeRefs or mention in prose)
${pathList}

FILE CONTENTS
${contents.join("\n\n")}${skippedLine}

TASK
${partTask}

The Foundations pathway must progress in this order:
1. what this project is
2. how a request or render flows
3. where state and data live
4. how auth and permissions work here
5. how to add a feature safely
6. how to debug here

Part 1 covers the beginning of that order. Part 2 continues without repeating and ends with how to debug here.

Return one JSON object with exactly this shape:

{
  "lessons": [
    {
      "id": "short-kebab-case-slug",
      "title": "Lesson title",
      "goal": "What the learner will be able to do after this lesson.",
      "explain": "Markdown, 250-500 words. Teach using THIS repo. At least two real allowed file paths in backticks.",
      "codeRefs": [
        { "file": "real/path/from/the/list.ts", "note": "What to look at here, at most two sentences." }
      ],
      "gekoTip": "At most two warm sentences in Geko's voice. Point at a real file.",
      "quiz": [
        {
          "question": "A question answerable only after reading THIS lesson about THIS codebase.",
          "options": ["plausible option", "plausible option", "plausible option"],
          "correctIndex": 0,
          "why": "Why the correct option is right, grounded in this lesson and repo."
        }
      ]
    }
  ]
}

HARD CONSTRAINTS
- Return exactly ${allowedCount.min}-${allowedCount.max} lessons for this part.
- explain: 250-500 words of markdown. Use short paragraphs; headings are allowed but not required. It must contain at least two DISTINCT real allowed paths in backticks.
- codeRefs: 1-4 items, each file copied exactly from ALLOWED FILE PATHS. The note says what to look at, at most two sentences.
- gekoTip: at most two sentences, in Geko's voice, pointing at a real file.
- quiz: 2-3 questions. Each has 3-4 options, exactly one correct, and correctIndex is the 0-based index of the correct option.
- Quiz questions must be answerable ONLY by someone who read THIS lesson about THIS codebase. Wrong options must be real-but-wrong files or concepts from this repo, never jokes.
- Do not invent files, routes, features or dependencies. Never cite a path outside ALLOWED FILE PATHS.
- ids must be lowercase kebab-case and unique within this part. Do not reuse an existing lesson id.
- No generic tutorial content. No emojis. No hype words. Do not output an xp field.`;

  return { prompt, includedFiles, includedChars, allowedCount };
}

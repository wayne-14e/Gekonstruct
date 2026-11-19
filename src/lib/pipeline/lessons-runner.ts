import "server-only";

import type { GuidebookDoc } from "@/lib/domain/architecture";
import { LESSON_LIMITS, lessonPartLimits, type LessonDoc, type Part } from "@/lib/domain/lesson";
import type { SnapshotDoc, Stack } from "@/lib/domain/project";
import { requestStructured } from "@/lib/llm";
import { normalizeLessons } from "@/lib/pipeline/lessons";
import {
  LESSONS_PROMPT_VERSION,
  LESSONS_SYSTEM_PROMPT,
  buildLessonsUserPrompt,
} from "@/lib/prompts";

export type LessonsResult = {
  lessons: LessonDoc[];
  part: Part;
  attempts: number;
  model: string;
  promptVersion: string;
  droppedCodeRefs: string[];
  softWarnings: string[];
  trimmedCounts: string[];
  includedFiles: number;
  includedChars: number;
};

/**
 * Stage `lessons1` or `lessons2`: one model call over the stored snapshot + guidebook,
 * validated against the real paths. No Firestore here; the route owns writes so a retry
 * overwrites only its own part.
 */
export async function runLessons(input: {
  owner: string;
  repo: string;
  stack: Stack | null;
  snapshot: SnapshotDoc;
  guidebook: GuidebookDoc;
  part: Part;
  /** Part 1 lessons when writing part 2; empty when writing part 1. */
  existingLessons: LessonDoc[];
}): Promise<LessonsResult> {
  const allowedPaths = input.snapshot.files.map((file) => file.path);
  const allowedCount = lessonPartLimits(input.part, input.existingLessons.length);
  const startOrder =
    input.existingLessons.reduce((max, lesson) => Math.max(max, lesson.order), 0) + 1;

  const { prompt, includedFiles, includedChars } = buildLessonsUserPrompt({
    owner: input.owner,
    repo: input.repo,
    part: input.part,
    stack: input.stack,
    guidebook: input.guidebook,
    files: input.snapshot.files,
    existingLessons: input.existingLessons,
  });

  const result = await requestStructured({
    label: `lessons${input.part}`,
    system: LESSONS_SYSTEM_PROMPT,
    user: prompt,
    invalidOutputMessage:
      "The AI couldn't produce lessons that match this repository. Try again — a retry usually fixes it.",
    validate: (raw) => {
      const normalized = normalizeLessons(raw, allowedPaths, {
        part: input.part,
        startOrder,
        existingIds: new Set(input.existingLessons.map((lesson) => lesson.id)),
        allowedCount,
        requireTotalMin: input.part === 2 ? LESSON_LIMITS.total.min : undefined,
      });

      if (!normalized.ok) {
        return { ok: false, problems: normalized.problems };
      }

      return {
        ok: true,
        value: {
          lessons: normalized.value,
          droppedCodeRefs: normalized.droppedCodeRefs,
          softWarnings: normalized.softWarnings,
          trimmedCounts: normalized.trimmedCounts,
        },
      };
    },
  });

  return {
    lessons: result.value.lessons,
    part: input.part,
    attempts: result.attempts,
    model: result.model,
    promptVersion: LESSONS_PROMPT_VERSION,
    droppedCodeRefs: result.value.droppedCodeRefs,
    softWarnings: result.value.softWarnings,
    trimmedCounts: result.value.trimmedCounts,
    includedFiles,
    includedChars,
  };
}

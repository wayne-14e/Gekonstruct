import { z } from "zod";
import { isOverviewSection } from "@/lib/domain/event";

/**
 * `projects/{pid}/progress/{uid}` (BLUEPRINT §7). Timestamps are epoch millis.
 *
 * Two fields are extras beyond the blueprint record:
 * - `pathwayBonusAwarded` pays the completion bonus exactly once across retakes.
 * - `overviewSections` records which architecture-map sections were read so the
 *   `map-reader` badge and `overview_section_viewed` events are idempotent.
 * - `understoodRequestSteps` saves the learner's progress through the request walkthrough.
 */
export const LessonProgressSchema = z.object({
  passed: z.boolean(),
  score: z.number().min(0).max(1),
  at: z.number().int().nonnegative(),
});

export type LessonProgress = z.infer<typeof LessonProgressSchema>;

export const DebugProgressSchema = z.object({
  completed: z.boolean(),
  at: z.number().int().nonnegative(),
});

export const ProgressDocSchema = z.object({
  lessons: z.record(z.string(), LessonProgressSchema).default({}),
  debug: z.record(z.string(), DebugProgressSchema).default({}),
  badges: z.array(z.string()).default([]),
  xp: z.number().int().nonnegative().default(0),
  pathwayBonusAwarded: z.boolean().default(false),
  overviewSections: z
    .array(z.string())
    .default([])
    .transform((sections) =>
      Array.from(
        new Set(
          sections
            .map((section) => (section === "layers" ? "skillmap" : section))
            .filter(isOverviewSection),
        ),
      ),
    ),
  understoodRequestSteps: z.array(z.number().int().nonnegative()).default([]),
});

export type ProgressDoc = z.infer<typeof ProgressDocSchema>;

export function emptyProgressDoc(): ProgressDoc {
  return {
    lessons: {},
    debug: {},
    badges: [],
    xp: 0,
    pathwayBonusAwarded: false,
    overviewSections: [],
    understoodRequestSteps: [],
  };
}

export function mergeUnderstoodRequestSteps(
  existing: readonly number[],
  stepIndex: number,
  totalSteps: number,
): number[] {
  return Array.from(
    new Set(
      [...existing, stepIndex].filter(
        (index) => Number.isInteger(index) && index >= 0 && index < totalSteps,
      ),
    ),
  ).sort((left, right) => left - right);
}

export function nextRequestStepIndex(
  understoodSteps: readonly number[],
  totalSteps: number,
): number {
  const completed = new Set(understoodSteps);
  for (let index = 0; index < totalSteps; index += 1) {
    if (!completed.has(index)) return index;
  }
  return -1;
}

export function countPassedLessons(
  progress: ProgressDoc | null,
  lessons: ReadonlyArray<{ id: string; passed?: boolean }>,
): number {
  if (!progress) return 0;
  return lessons.filter((lesson) => progress.lessons[lesson.id]?.passed === true).length;
}

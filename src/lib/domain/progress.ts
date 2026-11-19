import { z } from "zod";

/**
 * `projects/{pid}/progress/{uid}` (BLUEPRINT §7). Timestamps are epoch millis.
 *
 * `pathwayBonusAwarded` is an extra field beyond the blueprint record: without it the
 * completion bonus cannot be awarded exactly once when a learner retakes a passed quiz.
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
});

export type ProgressDoc = z.infer<typeof ProgressDocSchema>;

export function emptyProgressDoc(): ProgressDoc {
  return {
    lessons: {},
    debug: {},
    badges: [],
    xp: 0,
    pathwayBonusAwarded: false,
  };
}

export function countPassedLessons(
  progress: ProgressDoc | null,
  lessons: ReadonlyArray<{ id: string; passed?: boolean }>,
): number {
  if (!progress) return 0;
  return lessons.filter((lesson) => progress.lessons[lesson.id]?.passed === true).length;
}

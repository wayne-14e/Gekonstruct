import { z } from "zod";

/**
 * The Foundations pathway (BLUEPRINT §6, stages `lessons1` / `lessons2`).
 *
 * The model returns `LessonModelSchema` (loose counts), the normaliser in
 * `src/lib/pipeline/lessons.ts` checks every file reference against the snapshot and fixes
 * ids/order before `LessonDocSchema` is written to `projects/{pid}/lessons/{lid}`.
 */
export const LESSON_LIMITS = {
  total: { min: 6, max: 10 },
  part: { min: 2, max: 5 },
  explainWords: { min: 250, max: 500 },
  explainChars: { min: 800, max: 6_000 },
  codeRefs: { min: 1, max: 4 },
  quiz: { min: 2, max: 3 },
  options: { min: 3, max: 4 },
  xp: 20,
  passThreshold: 0.7,
  pathwayBonus: 50,
} as const;

const TextSchema = (max: number) => z.string().trim().min(1).max(max);
const FilePathSchema = z.string().trim().min(1).max(300);

export const QuizQuestionSchema = z
  .object({
    question: TextSchema(600),
    options: z.array(TextSchema(300)).min(LESSON_LIMITS.options.min).max(LESSON_LIMITS.options.max),
    correctIndex: z.number().int().nonnegative(),
    why: TextSchema(800),
  })
  .superRefine((question, ctx) => {
    if (question.correctIndex >= question.options.length) {
      ctx.addIssue({
        code: "custom",
        path: ["correctIndex"],
        message: "correctIndex must point at one of the options.",
      });
    }
  });

export type QuizQuestion = z.infer<typeof QuizQuestionSchema>;

export const CodeRefSchema = z.object({
  file: FilePathSchema,
  note: TextSchema(500),
});

export type CodeRef = z.infer<typeof CodeRefSchema>;

/** What the model must return per lesson. Counts are deliberately loose for the repair pass. */
export const LessonModelSchema = z.object({
  id: z.string().trim().max(100).optional(),
  title: TextSchema(160),
  goal: TextSchema(600),
  explain: TextSchema(10_000),
  codeRefs: z.array(CodeRefSchema).min(1).max(8),
  gekoTip: TextSchema(600),
  quiz: z.array(QuizQuestionSchema).min(1).max(5),
});

export type LessonModel = z.infer<typeof LessonModelSchema>;

export const LessonsModelSchema = z.object({
  lessons: z.array(LessonModelSchema).min(1).max(12),
});

export type LessonsModel = z.infer<typeof LessonsModelSchema>;

/** Stored lesson content, after the normaliser has fixed ids, order, part and XP. */
export const LessonContentSchema = z.object({
  id: z.string().trim().min(1).max(80),
  title: TextSchema(160),
  goal: TextSchema(600),
  explain: TextSchema(10_000),
  codeRefs: z.array(CodeRefSchema).min(LESSON_LIMITS.codeRefs.min).max(LESSON_LIMITS.codeRefs.max),
  gekoTip: TextSchema(600),
  xp: z.literal(LESSON_LIMITS.xp),
  quiz: z
    .array(QuizQuestionSchema)
    .min(LESSON_LIMITS.quiz.min)
    .max(LESSON_LIMITS.quiz.max),
});

export type LessonContent = z.infer<typeof LessonContentSchema>;

export const LessonDocSchema = LessonContentSchema.extend({
  order: z.number().int().positive(),
  part: z.union([z.literal(1), z.literal(2)]),
});

export type LessonDoc = z.infer<typeof LessonDocSchema>;

export type Part = LessonDoc["part"];

/** How many lessons each stage must request and accept (BLUEPRINT §6: 6–10 total). */
export function lessonPartLimits(part: Part, existingCount: number): { min: number; max: number } {
  if (part === 1) return { min: 3, max: 5 };
  return {
    min: Math.max(2, LESSON_LIMITS.total.min - existingCount),
    max: Math.max(1, Math.min(LESSON_LIMITS.part.max, LESSON_LIMITS.total.max - existingCount)),
  };
}

/** The quiz shape sent to the browser: no `correctIndex`, no `why` before submission. */
export type PublicQuizQuestion = Pick<QuizQuestion, "question" | "options">;

import { z } from "zod";
import { QuizQuestionSchema } from "@/lib/domain/lesson";

/**
 * Debug pathway (BLUEPRINT §6, §7, §8).
 *
 * User inputs a symptom → Gekonstruct matches top-10 files, calls the model,
 * checks every evidence file against the snapshot, and stores a DebugSessionDoc.
 */
export const DEBUG_LIMITS = {
  likelyCauses: { min: 2, max: 3 },
  fixSteps: { min: 3, max: 7 },
  quiz: { min: 1, max: 2 },
  options: { min: 3, max: 4 },
  xp: 30,
  passThreshold: 0.7,
  symptomMinChars: 10,
  symptomMaxChars: 2_000,
  freeSessionsPerProject: 2,
} as const;

export function freeDebugSessionsRemaining(used: number): number {
  return Math.max(0, DEBUG_LIMITS.freeSessionsPerProject - used);
}

const TextSchema = (max: number) => z.string().trim().min(1).max(max);
const FilePathSchema = z.string().trim().min(1).max(300);

export const ConfidenceSchema = z.enum(["high", "medium", "low"]);
export type Confidence = z.infer<typeof ConfidenceSchema>;

export const LikelyCauseSchema = z.object({
  cause: TextSchema(1_000),
  evidenceFiles: z.array(FilePathSchema).min(1).max(6),
  confidence: ConfidenceSchema,
});

export type LikelyCause = z.infer<typeof LikelyCauseSchema>;

export const WhyItWorksSchema = z.object({
  concept: TextSchema(300),
  explanation: TextSchema(5_000),
});

export type WhyItWorks = z.infer<typeof WhyItWorksSchema>;

/** Loose schema for raw LLM JSON before validation and path auditing. */
export const DebugModelSchema = z.object({
  likelyCauses: z.array(LikelyCauseSchema).min(DEBUG_LIMITS.likelyCauses.min).max(6),
  fixSteps: z.array(TextSchema(1_000)).min(DEBUG_LIMITS.fixSteps.min).max(10),
  whyItWorks: WhyItWorksSchema,
  quiz: z.array(QuizQuestionSchema).min(DEBUG_LIMITS.quiz.min).max(4),
  gekoTip: TextSchema(600),
});

export type DebugModel = z.infer<typeof DebugModelSchema>;

/** Stored content after path verification and XP assignment. */
export const DebugSessionContentSchema = z.object({
  likelyCauses: z
    .array(LikelyCauseSchema)
    .min(DEBUG_LIMITS.likelyCauses.min)
    .max(DEBUG_LIMITS.likelyCauses.max),
  fixSteps: z
    .array(TextSchema(1_000))
    .min(DEBUG_LIMITS.fixSteps.min)
    .max(DEBUG_LIMITS.fixSteps.max),
  whyItWorks: WhyItWorksSchema,
  quiz: z
    .array(QuizQuestionSchema)
    .min(DEBUG_LIMITS.quiz.min)
    .max(DEBUG_LIMITS.quiz.max),
  gekoTip: TextSchema(600),
  xp: z.literal(DEBUG_LIMITS.xp),
});

export type DebugSessionContent = z.infer<typeof DebugSessionContentSchema>;

export const DebugSessionStatusSchema = z.enum(["pending", "done", "failed"]);
export type DebugSessionStatus = z.infer<typeof DebugSessionStatusSchema>;

export const DebugUsageDocSchema = z.object({
  projectId: z.string().min(1),
  sessionsUsed: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
});

/**
 * Full Firestore doc in `projects/{pid}/debugSessions/{sid}` (BLUEPRINT §7).
 */
export const DebugSessionDocSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  symptom: z.string().min(1),
  status: DebugSessionStatusSchema,
  error: z.string().nullable().optional(),
  likelyCauses: z.array(LikelyCauseSchema).optional(),
  fixSteps: z.array(z.string()).optional(),
  whyItWorks: WhyItWorksSchema.optional(),
  quiz: z.array(QuizQuestionSchema).optional(),
  gekoTip: z.string().optional(),
  xp: z.number().int().optional(),
  createdAt: z.number().int().nonnegative(),
  analyzedAt: z.number().int().nonnegative().optional(),
  model: z.string().optional(),
  promptVersion: z.string().optional(),
});

export type DebugSessionDoc = z.infer<typeof DebugSessionDocSchema>;

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
  dataPath: { min: 3, max: 6, distinctFiles: 2 },
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

/**
 * One hop in the bug's data path: which component/module hands what to which one,
 * and the real snapshot file where that hop happens.
 */
export const DataPathStepSchema = z.object({
  from: TextSchema(160),
  to: TextSchema(160),
  file: FilePathSchema,
  whatHappens: TextSchema(900),
});

export type DataPathStep = z.infer<typeof DataPathStepSchema>;

/**
 * The trace a learner follows to see how data moves between components before the
 * symptom appears. `entry` is the trigger, `breaksAt` is where the reported symptom
 * shows up on this path.
 */
export const DataPathSchema = z.object({
  entry: TextSchema(200),
  steps: z.array(DataPathStepSchema).min(1).max(12),
  breaksAt: TextSchema(400),
});

export type DataPath = z.infer<typeof DataPathSchema>;

/** Loose schema for raw LLM JSON before validation and path auditing. */
export const DebugModelSchema = z.object({
  likelyCauses: z.array(LikelyCauseSchema).min(DEBUG_LIMITS.likelyCauses.min).max(6),
  fixSteps: z.array(TextSchema(1_000)).min(DEBUG_LIMITS.fixSteps.min).max(10),
  dataPath: DataPathSchema,
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
  dataPath: z.object({
    entry: TextSchema(200),
    steps: z
      .array(DataPathStepSchema)
      .min(DEBUG_LIMITS.dataPath.min)
      .max(DEBUG_LIMITS.dataPath.max),
    breaksAt: TextSchema(400),
  }),
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
  dataPath: DataPathSchema.optional(),
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

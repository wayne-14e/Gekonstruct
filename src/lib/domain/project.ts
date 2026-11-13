import { z } from "zod";

/**
 * Firestore project documents. Timestamps are epoch milliseconds, matching `users`.
 * `stage` moves forward one step per pipeline route; a failure is recorded as
 * `failed:<stageThatWouldHaveCompleted>` plus a human-readable `stageError`.
 */
export const ProjectStageSchema = z.enum([
  "created",
  "ingested",
  "architecture",
  "lessons1",
  "lessons2",
  "ready",
  "failed:ingested",
  "failed:architecture",
  "failed:lessons1",
  "failed:lessons2",
]);

export type ProjectStage = z.infer<typeof ProjectStageSchema>;
export type PipelineStage = Exclude<ProjectStage, `failed:${string}`>;
export type FailedStage = Extract<ProjectStage, `failed:${string}`>;

export const MAX_PROJECTS = 3;

export function isFailedStage(stage: ProjectStage): stage is FailedStage {
  return stage.startsWith("failed:");
}

export function failedPipelineStage(stage: FailedStage): PipelineStage {
  return stage.slice("failed:".length) as PipelineStage;
}

export const STAGE_LABELS: Record<ProjectStage, string> = {
  created: "Queued",
  ingested: "Ingested",
  architecture: "Mapped",
  lessons1: "Lessons 1/2",
  lessons2: "Lessons 2/2",
  ready: "Ready",
  "failed:ingested": "Ingestion failed",
  "failed:architecture": "Map failed",
  "failed:lessons1": "Lessons 1/2 failed",
  "failed:lessons2": "Lessons 2/2 failed",
};

export function stageLabel(stage: ProjectStage): string {
  return STAGE_LABELS[stage];
}

export const StackSchema = z.object({
  framework: z.string().nullable(),
  language: z.string().nullable(),
  uiLib: z.string().nullable(),
  backend: z.string().nullable(),
  db: z.string().nullable(),
  auth: z.string().nullable(),
  hosting: z.string().nullable(),
});

export type Stack = z.infer<typeof StackSchema>;

export const SnapshotFileSchema = z.object({
  path: z.string().min(1),
  size: z.number().int().nonnegative(),
  content: z.string(),
});

export const SnapshotDocSchema = z.object({
  files: z.array(SnapshotFileSchema),
  fetchedAt: z.number().int().nonnegative(),
  totalChars: z.number().int().nonnegative(),
  truncated: z.array(z.string()),
});

export type SnapshotDoc = z.infer<typeof SnapshotDocSchema>;
export type SnapshotFile = z.infer<typeof SnapshotFileSchema>;

export const ProjectDocSchema = z.object({
  ownerUid: z.string().min(1),
  repoUrl: z.string().url(),
  owner: z.string().min(1),
  repo: z.string().min(1),
  title: z.string().min(1),
  stage: ProjectStageSchema,
  stageError: z.string().nullable(),
  stack: StackSchema.nullable(),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
  lessonCount: z.number().int().nonnegative(),
});

export type ProjectDoc = z.infer<typeof ProjectDocSchema>;

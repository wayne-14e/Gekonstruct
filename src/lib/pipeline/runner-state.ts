import type { ProjectStage } from "@/lib/domain/project";

export type StepKey = "ingest" | "architecture" | "lessons1" | "lessons2";
export type StepState = "done" | "active" | "failed" | "pending";

export const PIPELINE_STEP_KEYS: readonly StepKey[] = [
  "ingest",
  "architecture",
  "lessons1",
  "lessons2",
];

export function initialFailedStep(stage: ProjectStage): StepKey | null {
  if (stage === "failed:ingested") return "ingest";
  if (stage === "failed:architecture") return "architecture";
  if (stage === "failed:lessons1") return "lessons1";
  if (stage === "failed:lessons2") return "lessons2";
  return null;
}

export interface RunnerProgressInput {
  stage: ProjectStage;
  hasSnapshot: boolean;
  hasGuidebook: boolean;
  lessonCount: number;
  activeStep: StepKey | null;
  failedStep: StepKey | null;
  completedSteps: ReadonlySet<StepKey>;
}

export interface RunnerProgress {
  done: Record<StepKey, boolean>;
  states: Record<StepKey, StepState>;
  completedCount: number;
  startIndex: number;
}

/**
 * Combines persisted Firestore state with steps completed in the current client run so
 * finished stages turn green immediately instead of reverting to pending while `router.refresh()`
 * catches up.
 */
export function resolveRunnerProgress(input: RunnerProgressInput): RunnerProgress {
  const { stage, hasSnapshot, hasGuidebook, lessonCount, activeStep, failedStep, completedSteps } =
    input;

  const ingestDone = (hasSnapshot && stage !== "failed:ingested") || completedSteps.has("ingest");
  const mappedDone =
    (hasGuidebook &&
      stage !== "created" &&
      stage !== "ingested" &&
      stage !== "failed:ingested" &&
      stage !== "failed:architecture") ||
    completedSteps.has("architecture");
  const lessons1Done =
    (mappedDone && lessonCount > 0 && stage !== "failed:lessons1") ||
    completedSteps.has("lessons1");
  const lessons2Done = (lessons1Done && stage === "ready") || completedSteps.has("lessons2");

  const done: Record<StepKey, boolean> = {
    ingest: ingestDone,
    architecture: mappedDone,
    lessons1: lessons1Done,
    lessons2: lessons2Done,
  };

  function stateFor(key: StepKey): StepState {
    if (activeStep === key) return "active";
    if (failedStep === key) return "failed";
    return done[key] ? "done" : "pending";
  }

  const states: Record<StepKey, StepState> = {
    ingest: stateFor("ingest"),
    architecture: stateFor("architecture"),
    lessons1: stateFor("lessons1"),
    lessons2: stateFor("lessons2"),
  };

  const completedCount = PIPELINE_STEP_KEYS.filter((key) => done[key]).length;
  const startIndex = !ingestDone ? 0 : !mappedDone ? 1 : !lessons1Done ? 2 : !lessons2Done ? 3 : 4;

  return { done, states, completedCount, startIndex };
}

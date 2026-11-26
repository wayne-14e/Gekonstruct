import { describe, expect, it } from "vitest";
import { initialFailedStep, resolveRunnerProgress } from "./runner-state";

describe("initialFailedStep", () => {
  it("maps failed project stages to their step key", () => {
    expect(initialFailedStep("failed:ingested")).toBe("ingest");
    expect(initialFailedStep("failed:architecture")).toBe("architecture");
    expect(initialFailedStep("failed:lessons1")).toBe("lessons1");
    expect(initialFailedStep("failed:lessons2")).toBe("lessons2");
    expect(initialFailedStep("created")).toBeNull();
    expect(initialFailedStep("ready")).toBeNull();
  });
});

describe("resolveRunnerProgress", () => {
  it("keeps ingest done immediately after it finishes while architecture is running", () => {
    const progress = resolveRunnerProgress({
      stage: "created",
      hasSnapshot: false,
      hasGuidebook: false,
      lessonCount: 0,
      activeStep: "architecture",
      failedStep: null,
      completedSteps: new Set(["ingest"]),
    });

    expect(progress.done.ingest).toBe(true);
    expect(progress.states).toEqual({
      ingest: "done",
      architecture: "active",
      lessons1: "pending",
      lessons2: "pending",
    });
    expect(progress.completedCount).toBe(1);
    expect(progress.startIndex).toBe(1);
  });

  it("marks ingest done on retry from failed:ingested as soon as ingest succeeds", () => {
    const progress = resolveRunnerProgress({
      stage: "failed:ingested",
      hasSnapshot: false,
      hasGuidebook: false,
      lessonCount: 0,
      activeStep: "architecture",
      failedStep: null,
      completedSteps: new Set(["ingest"]),
    });

    expect(progress.states.ingest).toBe("done");
    expect(progress.states.architecture).toBe("active");
    expect(progress.completedCount).toBe(1);
  });

  it("preserves earlier completed steps when a later step fails", () => {
    const progress = resolveRunnerProgress({
      stage: "ingested",
      hasSnapshot: true,
      hasGuidebook: false,
      lessonCount: 0,
      activeStep: null,
      failedStep: "architecture",
      completedSteps: new Set(["ingest"]),
    });

    expect(progress.states).toEqual({
      ingest: "done",
      architecture: "failed",
      lessons1: "pending",
      lessons2: "pending",
    });
    expect(progress.completedCount).toBe(1);
    expect(progress.startIndex).toBe(1);
  });

  it("reaches 4/4 done when all steps finish before server props flip to ready", () => {
    const progress = resolveRunnerProgress({
      stage: "lessons1",
      hasSnapshot: true,
      hasGuidebook: true,
      lessonCount: 4,
      activeStep: null,
      failedStep: null,
      completedSteps: new Set(["ingest", "architecture", "lessons1", "lessons2"]),
    });

    expect(progress.completedCount).toBe(4);
    expect(progress.startIndex).toBe(4);
    expect(progress.states).toEqual({
      ingest: "done",
      architecture: "done",
      lessons1: "done",
      lessons2: "done",
    });
  });
});

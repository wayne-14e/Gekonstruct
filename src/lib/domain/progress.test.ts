import { describe, expect, it } from "vitest";
import {
  mergeUnderstoodRequestSteps,
  nextRequestStepIndex,
  ProgressDocSchema,
} from "@/lib/domain/progress";

describe("mergeUnderstoodRequestSteps", () => {
  it("adds a step once and keeps saved progress in order", () => {
    expect(mergeUnderstoodRequestSteps([2, 0], 1, 4)).toEqual([0, 1, 2]);
    expect(mergeUnderstoodRequestSteps([0, 1], 1, 4)).toEqual([0, 1]);
  });

  describe("nextRequestStepIndex", () => {
    it("returns the first uncompleted step or -1 when finished", () => {
      expect(nextRequestStepIndex([0, 2], 4)).toBe(1);
      expect(nextRequestStepIndex([0, 1, 2, 3], 4)).toBe(-1);
    });
  });

  describe("ProgressDocSchema", () => {
    it("maps legacy layer-read progress to the replacement skill-map area", () => {
      expect(ProgressDocSchema.parse({ overviewSections: ["summary", "layers"] }).overviewSections)
        .toEqual(["summary", "skillmap"]);
    });
  });

  it("drops invalid or out-of-range saved steps", () => {
    expect(mergeUnderstoodRequestSteps([-1, 8, 1.5, 0], 4, 4)).toEqual([0]);
  });
});

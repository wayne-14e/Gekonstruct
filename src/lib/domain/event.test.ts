import { describe, expect, it } from "vitest";
import {
  OVERVIEW_SECTIONS,
  RETURN_VISIT_AFTER_MS,
  isOverviewComplete,
  isReturnVisitDue,
  lessonViewedEventId,
  mergeViewedSections,
  overviewSectionEventId,
} from "@/lib/domain/event";

describe("mergeViewedSections", () => {
  it("adds a known section once", () => {
    expect(mergeViewedSections([], "summary")).toEqual(["summary"]);
    expect(mergeViewedSections(["summary"], "summary")).toEqual(["summary"]);
    expect(mergeViewedSections([], "flow")).toEqual(["flow"]);
  });

  it("ignores unknown values and cleans the existing list", () => {
    expect(mergeViewedSections(["summary", "nope"], "concepts")).toEqual(["summary", "concepts"]);
    expect(mergeViewedSections(["summary"], "nope")).toEqual(["summary"]);
  });
});

describe("isOverviewComplete", () => {
  it("requires every section, in any order", () => {
    expect(isOverviewComplete(OVERVIEW_SECTIONS)).toBe(true);
    expect(isOverviewComplete([...OVERVIEW_SECTIONS].reverse())).toBe(true);
    expect(isOverviewComplete(OVERVIEW_SECTIONS.slice(0, -1))).toBe(false);
    expect(isOverviewComplete([...OVERVIEW_SECTIONS, "nope"])).toBe(true);
  });
});

describe("isReturnVisitDue", () => {
  it("fires only after a full day", () => {
    const at = 1_700_000_000_000;
    expect(isReturnVisitDue(at, at + RETURN_VISIT_AFTER_MS - 1)).toBe(false);
    expect(isReturnVisitDue(at, at + RETURN_VISIT_AFTER_MS)).toBe(true);
    expect(isReturnVisitDue(at, at + RETURN_VISIT_AFTER_MS * 2)).toBe(true);
  });

  it("rejects a missing or nonsensical analysis timestamp", () => {
    expect(isReturnVisitDue(0, Date.now())).toBe(false);
    expect(isReturnVisitDue(Number.NaN, Date.now())).toBe(false);
  });
});

describe("deterministic event ids", () => {
  it("keeps a stable id per lesson and strips path separators", () => {
    expect(lessonViewedEventId("lesson-1")).toBe("lesson_viewed_lesson-1");
    expect(lessonViewedEventId("lesson/1")).toBe("lesson_viewed_lesson_1");
  });

  it("maps overview sections to fixed ids", () => {
    expect(overviewSectionEventId("summary")).toBe("overview_section_summary");
    expect(overviewSectionEventId("concepts")).toBe("overview_section_concepts");
  });
});

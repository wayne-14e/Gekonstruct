import { describe, expect, it } from "vitest";
import {
  BADGE_IDS,
  addBadge,
  earnedBadgeCount,
  isBadgeId,
  shouldAwardBadge,
  uniqueBadgeList,
} from "@/lib/badges";

describe("shouldAwardBadge", () => {
  it("awards once when the condition is met and the badge is new", () => {
    expect(
      shouldAwardBadge({ owned: [], badge: "foundation-builder", condition: true }),
    ).toBe(true);
    expect(
      shouldAwardBadge({
        owned: ["map-reader"],
        badge: "foundation-builder",
        condition: true,
      }),
    ).toBe(true);
  });

  it("never re-awards a badge already on the profile or project progress", () => {
    expect(
      shouldAwardBadge({
        owned: ["bug-whisperer"],
        badge: "bug-whisperer",
        condition: true,
      }),
    ).toBe(false);
  });

  it("does not award while the condition is false", () => {
    expect(
      shouldAwardBadge({ owned: [], badge: "map-reader", condition: false }),
    ).toBe(false);
  });
});

describe("addBadge", () => {
  it("appends without duplicating", () => {
    expect(addBadge([], "map-reader")).toEqual(["map-reader"]);
    expect(addBadge(["map-reader"], "map-reader")).toEqual(["map-reader"]);
  });

  it("keeps catalogue order regardless of award order", () => {
    expect(addBadge(["bug-whisperer"], "map-reader")).toEqual(["map-reader", "bug-whisperer"]);
  });
});

describe("uniqueBadgeList", () => {
  it("drops duplicates and keeps unknown legacy ids after known ones", () => {
    expect(
      uniqueBadgeList(["legacy-badge", "bug-whisperer", "bug-whisperer", "map-reader"]),
    ).toEqual(["map-reader", "bug-whisperer", "legacy-badge"]);
  });

  it("counts only catalogued badges toward the shelf", () => {
    expect(earnedBadgeCount(["map-reader", "legacy-badge"])).toBe(1);
    expect(earnedBadgeCount([...BADGE_IDS])).toBe(BADGE_IDS.length);
  });

  it("recognises only catalogued ids", () => {
    expect(isBadgeId("map-reader")).toBe(true);
    expect(isBadgeId("legacy-badge")).toBe(false);
  });
});

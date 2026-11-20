import { describe, expect, it } from "vitest";
import { describeActivity } from "@/lib/domain/activity";

describe("describeActivity", () => {
  it("shows lesson XP, pathway bonus, and badge rewards accurately", () => {
    expect(
      describeActivity({
        type: "quiz_passed",
        at: 1,
        meta: {
          lessonId: "state-and-data",
          xpAwarded: 70,
          bonusXp: 50,
          pathwayComplete: true,
          badgeAwarded: true,
        },
      }),
    ).toEqual({
      title: "Completed a Foundations lesson",
      details: [
        "Lesson: State And Data",
        "Earned 20 XP",
        "Earned 50 pathway bonus XP",
        "Earned Foundation Builder badge",
        "Completed the Foundations pathway",
      ],
      icon: "lesson",
    });
  });

  it("shows a debug completion XP and badge award", () => {
    expect(
      describeActivity({
        type: "debug_completed",
        at: 1,
        meta: { passed: true, xpAwarded: 30, badgeAwarded: true },
      }),
    ).toEqual({
      title: "Completed a Debug & Learn session",
      details: ["Earned 30 XP", "Earned Bug Whisperer badge"],
      icon: "xp",
    });
  });

  it("labels architecture badge awards and omits noisy section views", () => {
    expect(
      describeActivity({
        type: "pathway_completed",
        at: 1,
        meta: { pathway: "architecture", badge: "map-reader" },
      }),
    ).toEqual({
      title: "Earned the Map Reader badge",
      details: [],
      icon: "badge",
    });

    expect(
      describeActivity({
        type: "overview_section_viewed",
        at: 1,
        meta: { section: "layers" },
      }),
    ).toBeNull();
  });
});

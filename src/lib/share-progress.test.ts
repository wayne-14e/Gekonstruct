import { describe, expect, it } from "vitest";
import { buildProgressShareText } from "@/lib/share-progress";

describe("buildProgressShareText", () => {
  it("shares the profile name, XP, earned badges, and app link", () => {
    const text = buildProgressShareText({
      displayName: "Ada",
      totalXp: 1_250,
      badges: ["map-reader", "bug-whisperer"],
    });

    expect(text).toContain("Ada is learning to understand their code");
    expect(text).toContain("1,250 XP · Badges: Map Reader, Bug Whisperer");
    expect(text).toContain("https://gekonstruct.dev");
  });

  it("handles no badges and cleans up the display name", () => {
    const text = buildProgressShareText({
      displayName: "  Ada\nLovelace  ",
      totalXp: 0,
      badges: ["unknown-legacy-badge"],
    });

    expect(text).toContain("Ada Lovelace is learning");
    expect(text).toContain("0 XP · No badges earned yet");
  });
});

import { describe, expect, it } from "vitest";
import { freeDebugSessionsRemaining } from "@/lib/domain/debug";

describe("freeDebugSessionsRemaining", () => {
  it.each([
    { used: 0, remaining: 2 },
    { used: 1, remaining: 1 },
    { used: 2, remaining: 0 },
    { used: 5, remaining: 0 },
  ])("returns $remaining when $used sessions are used", ({ used, remaining }) => {
    expect(freeDebugSessionsRemaining(used)).toBe(remaining);
  });
});

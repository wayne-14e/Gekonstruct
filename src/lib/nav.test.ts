import { describe, expect, it } from "vitest";
import { safeNextPath } from "./nav";

describe("safeNextPath", () => {
  it("sends people to the dashboard when there is no destination", () => {
    expect(safeNextPath(undefined)).toBe("/dashboard");
    expect(safeNextPath(null)).toBe("/dashboard");
    expect(safeNextPath("")).toBe("/dashboard");
  });

  it("keeps same-site relative paths", () => {
    expect(safeNextPath("/projects/abc")).toBe("/projects/abc");
    expect(safeNextPath("/projects/abc/learn?lesson=1")).toBe("/projects/abc/learn?lesson=1");
  });

  it("refuses absolute and protocol-relative destinations", () => {
    expect(safeNextPath("https://evil.example/dashboard")).toBe("/dashboard");
    expect(safeNextPath("//evil.example/dashboard")).toBe("/dashboard");
    expect(safeNextPath("javascript:alert(1)")).toBe("/dashboard");
  });
});

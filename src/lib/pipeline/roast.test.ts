import { describe, expect, it } from "vitest";
import { normalizeRepoRoast } from "@/lib/pipeline/roast";

describe("normalizeRepoRoast", () => {
  it("accepts one punchy roast with a real snapshot file", () => {
    const result = normalizeRepoRoast(
      {
        quote: "Your auth flow touches twelve files; microchaos is a strong architectural choice.",
        file: "lib/auth/session.ts",
      },
      ["lib/auth/session.ts", "package.json"],
    );

    expect(result.ok).toBe(true);
  });

  it("rejects a fabricated file reference", () => {
    const result = normalizeRepoRoast(
      {
        quote: "Your auth flow touches twelve files; microchaos is a strong architectural choice.",
        file: "lib/missing.ts",
      },
      ["lib/auth/session.ts", "package.json"],
    );

    expect(result.ok).toBe(false);
  });

  it("rejects multi-sentence roasts", () => {
    const result = normalizeRepoRoast(
      {
        quote: "This code is busy. It has also seen things.",
        file: "package.json",
      },
      ["package.json"],
    );

    expect(result.ok).toBe(false);
  });
});

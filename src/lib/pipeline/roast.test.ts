import { describe, expect, it } from "vitest";
import { normalizeRepoRoast } from "@/lib/pipeline/roast";
import { computeRoastFacts, buildRoastUserPrompt } from "@/lib/prompts";

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

describe("computeRoastFacts", () => {
  const makeFile = (path: string, content: string) => ({ path, size: content.length, content });

  it("detects TODO and FIXME comments", () => {
    const files = [
      makeFile("src/main.py", "# TODO: clean this up\nprint('hello')"),
      makeFile("src/utils.py", "# FIXME: broken edge case"),
      makeFile("src/clean.py", "def add(a, b): return a + b"),
    ];
    const facts = computeRoastFacts(files);
    expect(facts.todoFiles).toEqual(["src/main.py", "src/utils.py"]);
  });

  it("detects duplicate basenames across directories", () => {
    const files = [
      makeFile("src/utils.py", ""),
      makeFile("lib/utils.py", ""),
      makeFile("src/main.py", ""),
    ];
    const facts = computeRoastFacts(files);
    expect(facts.duplicateNames).toContain("src/utils.py");
    expect(facts.duplicateNames).toContain("lib/utils.py");
    expect(facts.duplicateNames).not.toContain("src/main.py");
  });

  it("detects large files over 8 000 characters", () => {
    const big = "x".repeat(8_001);
    const files = [
      makeFile("src/big.py", big),
      makeFile("src/small.py", "tiny"),
    ];
    const facts = computeRoastFacts(files);
    expect(facts.largeFiles).toEqual(["src/big.py"]);
  });

  it("counts deps from package.json", () => {
    const pkg = JSON.stringify({
      dependencies: { react: "^18", next: "^14" },
      devDependencies: { vitest: "^1" },
    });
    const files = [makeFile("package.json", pkg)];
    const facts = computeRoastFacts(files);
    expect(facts.depCount).toBe(3);
  });

  it("counts deps from requirements.txt", () => {
    const req = "flask\nrequests\n# comment\n\npydantic";
    const files = [makeFile("requirements.txt", req)];
    const facts = computeRoastFacts(files);
    expect(facts.depCount).toBe(3);
  });

  it("detects auth files by path", () => {
    const files = [
      makeFile("src/auth/session.py", ""),
      makeFile("src/main.py", ""),
      makeFile("lib/auth_utils.py", ""),
    ];
    const facts = computeRoastFacts(files);
    expect(facts.authFiles).toContain("src/auth/session.py");
    expect(facts.authFiles).toContain("lib/auth_utils.py");
    expect(facts.authFiles).not.toContain("src/main.py");
  });

  it("returns null depCount when no manifest is present", () => {
    const files = [makeFile("src/main.py", "print('hi')")];
    const facts = computeRoastFacts(files);
    expect(facts.depCount).toBeNull();
  });
});

describe("buildRoastUserPrompt", () => {
  const makeFile = (path: string, content: string) => ({ path, size: content.length, content });

  it("includes VERIFIED FACTS section in the prompt", () => {
    const files = [
      makeFile("src/main.py", "# TODO: fix\nprint('hi')"),
      makeFile("package.json", JSON.stringify({ dependencies: { flask: "*" } })),
    ];
    const facts = computeRoastFacts(files);
    const { prompt, includedFiles } = buildRoastUserPrompt({
      owner: "acme",
      repo: "myrepo",
      stack: null,
      files,
      facts,
    });

    expect(prompt).toContain("VERIFIED FACTS");
    expect(prompt).toContain("TODO/FIXME");
    expect(prompt).toContain("HARD CONSTRAINTS");
    expect(includedFiles).toBeGreaterThan(0);
  });
});

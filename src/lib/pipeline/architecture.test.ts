import { describe, expect, it } from "vitest";
import type { SnapshotFile } from "@/lib/domain/project";
import {
  countWords,
  mentionsRealPath,
  normalizeArchitecture,
  realPathsFromSnapshot,
} from "@/lib/pipeline/architecture";
import {
  ARCHITECTURE_PROMPT_VERSION,
  MAX_PROMPT_FILE_CHARS,
  buildArchitectureUserPrompt,
} from "@/lib/prompts";

const PATHS = [
  "package.json",
  "app/page.tsx",
  "app/api/analyze/route.ts",
  "lib/analysis.ts",
  "components/result-card.tsx",
];

function layer(index: number, overrides: Record<string, unknown> = {}) {
  return {
    id: `layer-${index}`,
    name: `Layer ${index}`,
    purpose: "A job this project does.",
    files: ["app/page.tsx"],
    plainExplanation: "Requests start in `app/page.tsx`, which then calls the analysis code.",
    ...overrides,
  };
}

function concept(index: number, overrides: Record<string, unknown> = {}) {
  return {
    id: `concept-${index}`,
    term: `Term ${index}`,
    plainDefinition: "A plain definition grounded in this repo.",
    files: ["lib/analysis.ts"],
    whyItMatters: "It is where `lib/analysis.ts` decides what the app shows.",
    ...overrides,
  };
}

function flowStep(index: number, overrides: Record<string, unknown> = {}) {
  return {
    from: `Step ${index} source`,
    to: `Step ${index} target`,
    whatHappens: "The handler in `app/api/analyze/route.ts` runs the analysis.",
    ...overrides,
  };
}

type LooseModel = {
  summary: { whatItDoes: string; plainSummary: string; gekoIntro: string };
  architecture: {
    layers: Array<Record<string, unknown>>;
    dataFlow: Array<Record<string, unknown>>;
    mermaid: string | null;
  };
  concepts: Array<Record<string, unknown>>;
};

function validModel(overrides: Record<string, unknown> = {}): LooseModel {
  return {
    summary: {
      whatItDoes: "It analyses a repo and explains it.",
      plainSummary: "You paste a link, the app reads the code and writes a simple guide.",
      gekoIntro: "Let's read `app/page.tsx` together.",
    },
    architecture: {
      layers: [layer(1), layer(2), layer(3)],
      dataFlow: [flowStep(1), flowStep(2), flowStep(3), flowStep(4)],
      mermaid: null,
    },
    concepts: [concept(1), concept(2), concept(3), concept(4), concept(5)],
    ...overrides,
  };
}

describe("normalizeArchitecture", () => {
  it("accepts a complete map whose file refs are real", () => {
    const result = normalizeArchitecture(validModel(), PATHS);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.architecture.layers).toHaveLength(3);
    expect(result.value.concepts).toHaveLength(5);
    expect(result.value.architecture.mermaid).toBeNull();
    expect(result.droppedFileRefs).toEqual([]);
  });

  it("drops file refs the repo does not contain", () => {
    const model = validModel();
    model.architecture.layers[0] = layer(1, {
      files: ["app/page.tsx", "lib/invented-file.ts"],
    });

    const result = normalizeArchitecture(model, PATHS);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.architecture.layers[0]?.files).toEqual(["app/page.tsx"]);
    expect(result.droppedFileRefs).toContain("lib/invented-file.ts");
  });

  it("rejects a layer whose only files are invented", () => {
    const model = validModel();
    model.architecture.layers[1] = layer(2, { files: ["src/imaginary.ts"] });

    const result = normalizeArchitecture(model, PATHS);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems.join(" ")).toContain("none of the listed paths exist");
  });

  it("accepts prose without a citation but records a soft warning", () => {
    const model = validModel();
    model.architecture.layers[2] = layer(3, {
      purpose: "This layer handles rendering.",
      plainExplanation: "This layer handles things in a general way.",
    });

    const result = normalizeArchitecture(model, PATHS);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.softWarnings.join(" ")).toContain("no path cited in prose");
  });

  it("rejects prose that cites a file the repo does not contain", () => {
    const model = validModel();
    model.architecture.layers[1] = layer(2, {
      plainExplanation: "Everything is wired together in `src/ghost-file.ts`.",
    });

    const result = normalizeArchitecture(model, PATHS);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems.join(" ")).toContain("src/ghost-file.ts");
  });

  it("does not mistake routes, folders or aliases for invented files", () => {
    const model = validModel();
    model.architecture.layers[2] = layer(3, {
      plainExplanation:
        "The request hits `/api/analyze`, lives in `app/api/analyze`, and imports from `@/lib/analysis`.",
    });

    const result = normalizeArchitecture(model, PATHS);

    expect(result.ok).toBe(true);
  });

  it("does not mistake CSS classes or tokens for files", () => {
    const model = validModel();
    model.concepts[0] = concept(1, {
      plainDefinition:
        "The theme sets `.card` and `.dark` while `--background` carries the base colour.",
    });

    const result = normalizeArchitecture(model, PATHS);

    expect(result.ok).toBe(true);
  });

  it("rejects a plain summary over the word budget", () => {
    const model = validModel();
    model.summary.plainSummary = Array.from({ length: 121 }, () => "word").join(" ");

    const result = normalizeArchitecture(model, PATHS);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems.join(" ")).toContain("121 words");
  });

  it("rejects too few layers, flow steps or concepts", () => {
    const model = validModel();
    model.architecture.layers = [layer(1), layer(2)];
    model.architecture.dataFlow = [flowStep(1), flowStep(2)];
    model.concepts = [concept(1), concept(2)];

    const result = normalizeArchitecture(model, PATHS);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    const problems = result.problems.join(" ");
    expect(problems).toContain("architecture.layers");
    expect(problems).toContain("architecture.dataFlow");
    expect(problems).toContain("concepts");
  });

  it("trims over-long lists instead of failing the stage", () => {
    const model = validModel();
    model.architecture.layers = Array.from({ length: 9 }, (_, index) => layer(index + 1));
    model.concepts = Array.from({ length: 15 }, (_, index) => concept(index + 1));

    const result = normalizeArchitecture(model, PATHS);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.architecture.layers).toHaveLength(7);
    expect(result.value.concepts).toHaveLength(12);
    expect(result.trimmedCounts.length).toBeGreaterThanOrEqual(2);
  });

  it("slugifies ids and keeps them unique", () => {
    const model = validModel();
    model.architecture.layers = [
      layer(1, { id: "The UI!", name: "UI" }),
      layer(2, { id: "The UI!", name: "UI again" }),
      layer(3, { id: "Data" }),
    ];

    const result = normalizeArchitecture(model, PATHS);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const ids = result.value.architecture.layers.map((item) => item.id);
    expect(ids).toEqual(["the-ui", "the-ui-2", "data"]);
  });

  it("keeps a valid mermaid flowchart and drops prose", () => {
    const withDiagram = validModel();
    withDiagram.architecture.mermaid =
      "flowchart LR\n  UI[app/page.tsx] --> API[app/api/analyze/route.ts]";
    const valid = normalizeArchitecture(withDiagram, PATHS);
    expect(valid.ok && valid.value.architecture.mermaid).toContain("flowchart LR");

    const withProse = validModel();
    withProse.architecture.mermaid = "This is not a diagram.";
    const invalid = normalizeArchitecture(withProse, PATHS);
    expect(invalid.ok && invalid.value.architecture.mermaid).toBeNull();
  });

  it("fails structurally invalid model output", () => {
    const result = normalizeArchitecture({ summary: {} }, PATHS);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems.length).toBeGreaterThan(0);
  });
});

describe("path helpers", () => {
  it("only reports a mention when a real path is present", () => {
    const allowed = new Set(PATHS);
    expect(mentionsRealPath("see app/page.tsx", allowed)).toBe(true);
    expect(mentionsRealPath("see src/nothing.ts", allowed)).toBe(false);
  });

  it("counts words the way the prompt budget does", () => {
    expect(countWords("  one   two three ")).toBe(3);
  });

  it("maps snapshot files to their paths", () => {
    expect(realPathsFromSnapshot([{ path: "a.ts" }, { path: "b.ts" }])).toEqual(["a.ts", "b.ts"]);
  });
});

describe("buildArchitectureUserPrompt", () => {
  const files: SnapshotFile[] = [
    { path: "package.json", size: 100, content: '{"dependencies":{"next":"16"}}' },
    { path: "app/page.tsx", size: 200, content: "export default function Page() {}" },
  ];

  it("includes the stack, every allowed path and file contents", () => {
    const { prompt, includedChars, includedFiles } = buildArchitectureUserPrompt({
      owner: "acme",
      repo: "widget",
      stack: {
        framework: "next",
        language: "typescript",
        uiLib: "tailwind",
        backend: "next-api",
        db: null,
        auth: null,
        hosting: "vercel",
      },
      files,
    });

    expect(ARCHITECTURE_PROMPT_VERSION).toBe("architecture-v2");
    expect(prompt).toContain("PROJECT: acme/widget");
    expect(prompt).toContain("- framework: next");
    expect(prompt).toContain("- app/page.tsx");
    expect(prompt).toContain("export default function Page() {}");
    expect(includedFiles).toBe(2);
    expect(includedChars).toBe(63);
  });

  it("names files that were left out when the budget is exceeded", () => {
    const big: SnapshotFile[] = [
      { path: "big.ts", size: MAX_PROMPT_FILE_CHARS, content: "x".repeat(MAX_PROMPT_FILE_CHARS) },
      { path: "small.ts", size: 10, content: "const a = 1;" },
    ];

    const { prompt, includedFiles } = buildArchitectureUserPrompt({
      owner: "acme",
      repo: "widget",
      stack: null,
      files: big,
    });

    expect(includedFiles).toBe(1);
    expect(prompt).toContain("were left out to fit the budget: small.ts");
    expect(prompt).toContain("- unknown");
  });
});

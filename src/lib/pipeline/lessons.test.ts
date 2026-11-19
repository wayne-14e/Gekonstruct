import { describe, expect, it } from "vitest";
import { LESSON_LIMITS } from "@/lib/domain/lesson";
import { normalizeLessons } from "@/lib/pipeline/lessons";

const PATHS = [
  "package.json",
  "app/page.tsx",
  "app/layout.tsx",
  "lib/analysis.ts",
  "components/result-card.tsx",
];

function explain(extra = ""): string {
  return `## Where it starts\n\nOpen \`app/page.tsx\` first, then follow \`lib/analysis.ts\`. ${extra}${"read ".repeat(250)}`;
}

function quiz(correctIndex = 0) {
  return [
    {
      question: "Where does the page begin?",
      options: ["app/page.tsx", "lib/analysis.ts", "components/result-card.tsx"],
      correctIndex,
      why: "The page component in `app/page.tsx` is the entry point.",
    },
    {
      question: "Which file holds the analysis?",
      options: ["lib/analysis.ts", "app/layout.tsx", "package.json"],
      correctIndex: 0,
      why: "The analysis helper lives in `lib/analysis.ts`.",
    },
  ];
}

function lesson(index: number, overrides: Record<string, unknown> = {}) {
  return {
    id: `lesson-${index}`,
    title: `Lesson ${index}`,
    goal: "Read the entry point and the helper it calls.",
    explain: explain(),
    codeRefs: [{ file: "app/page.tsx", note: "Start at the exported page component." }],
    gekoTip: "Follow `lib/analysis.ts` to see what happens next.",
    quiz: quiz(),
    ...overrides,
  };
}

function model(count = 3) {
  return { lessons: Array.from({ length: count }, (_, index) => lesson(index + 1)) };
}

describe("normalizeLessons", () => {
  it("accepts a part whose file refs are real and assigns order, part and XP", () => {
    const result = normalizeLessons(model(), PATHS, {
      part: 1,
      startOrder: 1,
      existingIds: new Set(),
      allowedCount: { min: 3, max: 5 },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toHaveLength(3);
    expect(result.value.map((item) => item.order)).toEqual([1, 2, 3]);
    expect(result.value.every((item) => item.part === 1)).toBe(true);
    expect(result.value.every((item) => item.xp === LESSON_LIMITS.xp)).toBe(true);
    expect(result.value[0]?.id).toBe("lesson-1");
    expect(result.value[0]?.codeRefs).toEqual([
      { file: "app/page.tsx", note: "Start at the exported page component." },
    ]);
  });

  it("rejects an explain that cites fewer than two real files", () => {
    const input = model();
    input.lessons[0] = lesson(1, {
      explain: `Only \`app/page.tsx\` is named here. ${"read ".repeat(260)}`,
    });

    const result = normalizeLessons(input, PATHS, {
      part: 1,
      startOrder: 1,
      existingIds: new Set(),
      allowedCount: { min: 3, max: 5 },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems.join(" ")).toContain("at least 2 distinct real file paths");
  });

  it("rejects a path that is not in the snapshot", () => {
    const input = model();
    input.lessons[1] = lesson(2, {
      explain: `Read \`app/page.tsx\` and \`lib/invented.ts\`. ${"read ".repeat(260)}`,
    });

    const result = normalizeLessons(input, PATHS, {
      part: 1,
      startOrder: 1,
      existingIds: new Set(),
      allowedCount: { min: 3, max: 5 },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems.join(" ")).toContain("lib/invented.ts");
  });

  it("drops unknown codeRefs and fails when none remain", () => {
    const input = model();
    input.lessons[0] = lesson(1, {
      codeRefs: [{ file: "src/imaginary.ts", note: "This file does not exist." }],
    });

    const result = normalizeLessons(input, PATHS, {
      part: 1,
      startOrder: 1,
      existingIds: new Set(),
      allowedCount: { min: 3, max: 5 },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems.join(" ")).toContain("none of the listed paths exist");
    expect(result.droppedCodeRefs).toContain("src/imaginary.ts");
  });

  it("trims excess lessons instead of failing the whole part", () => {
    const result = normalizeLessons(model(6), PATHS, {
      part: 1,
      startOrder: 1,
      existingIds: new Set(),
      allowedCount: { min: 3, max: 5 },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toHaveLength(5);
    expect(result.trimmedCounts.join(" ")).toContain("6 → 5");
  });

  it("keeps ids unique across parts and continues the order", () => {
    const input = model(2);
    input.lessons[0] = lesson(1, { id: "intro" });
    input.lessons[1] = lesson(2, { id: "intro" });

    const result = normalizeLessons(input, PATHS, {
      part: 2,
      startOrder: 4,
      existingIds: new Set(["intro", "request-flow", "data-lives", "auth"]),
      allowedCount: { min: 2, max: 5 },
      requireTotalMin: 6,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.map((item) => item.id)).toEqual(["intro-2", "intro-3"]);
    expect(result.value.map((item) => item.order)).toEqual([4, 5]);
  });

  it("rejects a quiz whose correctIndex points outside the options", () => {
    const input = model();
    input.lessons[0] = lesson(1, { quiz: quiz(9) });

    const result = normalizeLessons(input, PATHS, {
      part: 1,
      startOrder: 1,
      existingIds: new Set(),
      allowedCount: { min: 3, max: 5 },
    });

    expect(result.ok).toBe(false);
  });

  it("rejects a part below the minimum and below the pathway minimum", () => {
    const result = normalizeLessons(model(1), PATHS, {
      part: 2,
      startOrder: 4,
      existingIds: new Set(["intro", "request-flow", "data-lives"]),
      allowedCount: { min: 2, max: 5 },
      requireTotalMin: 6,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems.join(" ")).toContain("at least 2");
    expect(result.problems.join(" ")).toContain("at least 6");
  });

  it("rejects duplicate quiz options", () => {
    const input = model();
    input.lessons[0] = lesson(1, {
      quiz: [
        {
          question: "Which file?",
          options: ["app/page.tsx", "app/page.tsx", "lib/analysis.ts"],
          correctIndex: 0,
          why: "The page is the entry point.",
        },
        quiz()[1],
      ],
    });

    const result = normalizeLessons(input, PATHS, {
      part: 1,
      startOrder: 1,
      existingIds: new Set(),
      allowedCount: { min: 3, max: 5 },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems.join(" ")).toContain("options must be distinct");
  });
});

import { describe, expect, it } from "vitest";
import type { SnapshotFile } from "@/lib/domain/project";
import {
  extractSymptomKeywords,
  matchFilesBySymptom,
  normalizeDebugOutput,
} from "@/lib/pipeline/debug";

describe("extractSymptomKeywords", () => {
  it("extracts meaningful tokens and removes common stop words", () => {
    const symptom =
      "When the user signs in with Google, the session cookie is not saved in lib/auth.ts";
    const keywords = extractSymptomKeywords(symptom);

    expect(keywords).toContain("user");
    expect(keywords).toContain("signs");
    expect(keywords).toContain("google");
    expect(keywords).toContain("session");
    expect(keywords).toContain("cookie");
    expect(keywords).toContain("saved");
    expect(keywords).toContain("lib/auth.ts");

    expect(keywords).not.toContain("when");
    expect(keywords).not.toContain("the");
    expect(keywords).not.toContain("with");
    expect(keywords).not.toContain("is");
    expect(keywords).not.toContain("not");
    expect(keywords).not.toContain("in");
  });
});

describe("matchFilesBySymptom", () => {
  const sampleFiles: SnapshotFile[] = [
    { path: "package.json", size: 100, content: '{"name": "test-repo"}' },
    {
      path: "src/lib/auth.ts",
      size: 200,
      content: "export function verifySession(cookie: string) { return null; }",
    },
    {
      path: "src/app/api/auth/route.ts",
      size: 300,
      content: "import { verifySession } from '@/lib/auth'; export async function POST() {}",
    },
    {
      path: "src/components/login-button.tsx",
      size: 150,
      content: "export function LoginButton() { return <button>Sign in with Google</button>; }",
    },
    {
      path: "src/lib/db.ts",
      size: 180,
      content: "export const db = initializeDb();",
    },
    {
      path: "src/app/page.tsx",
      size: 250,
      content: "export default function Home() { return <div>Welcome</div>; }",
    },
  ];

  it("prioritizes files whose paths or contents match symptom keywords", () => {
    const symptom = "LoginButton fails when signing in with Google";
    const matched = matchFilesBySymptom(sampleFiles, symptom, 3);

    expect(matched.length).toBe(3);
    // login-button.tsx matches both path and content
    expect(matched[0].path).toBe("src/components/login-button.tsx");
  });

  it("ranks auth files first when symptom asks about cookies and session", () => {
    const symptom = "Session cookie verification fails";
    const matched = matchFilesBySymptom(sampleFiles, symptom, 2);

    expect(matched.length).toBe(2);
    expect(matched.map((f) => f.path)).toContain("src/lib/auth.ts");
  });

  it("returns files up to limit even if no keywords overlap", () => {
    const symptom = "Completely random gibberish unrelated xqkzzyw";
    const matched = matchFilesBySymptom(sampleFiles, symptom, 4);

    expect(matched.length).toBe(4);
    expect(matched[0].path).toBe("package.json");
  });

  it("returns all files if files length <= limit", () => {
    const matched = matchFilesBySymptom(sampleFiles.slice(0, 3), "any symptom", 10);
    expect(matched.length).toBe(3);
  });
});

describe("normalizeDebugOutput", () => {
  const allowed = new Set([
    "src/lib/auth.ts",
    "src/app/api/auth/route.ts",
    "src/components/login-button.tsx",
  ]);

  const validRaw = {
    likelyCauses: [
      {
        cause: "The session cookie in `src/lib/auth.ts` is not set with httpOnly attribute.",
        evidenceFiles: ["src/lib/auth.ts"],
        confidence: "high",
      },
      {
        cause: "The POST handler in `src/app/api/auth/route.ts` rejects undefined body.",
        evidenceFiles: ["src/app/api/auth/route.ts"],
        confidence: "medium",
      },
    ],
    fixSteps: [
      "Step 1: Check `src/lib/auth.ts` for cookie settings.",
      "Step 2: Inspect `src/app/api/auth/route.ts` response headers.",
      "Step 3: Update `src/components/login-button.tsx` to handle errors.",
    ],
    dataPath: {
      entry: "The user clicks Sign in with Google.",
      steps: [
        {
          from: "LoginButton",
          to: "signInAction",
          file: "src/components/login-button.tsx",
          whatHappens: "The button sends the Google ID token into the sign-in action.",
        },
        {
          from: "signInAction",
          to: "session cookie",
          file: "src/app/api/auth/route.ts",
          whatHappens: "The handler verifies the token and prepares the session response.",
        },
        {
          from: "session cookie",
          to: "verifySession",
          file: "src/lib/auth.ts",
          whatHappens: "`src/lib/auth.ts` reads the cookie on the next request and resolves the user.",
        },
      ],
      breaksAt: "The cookie never arrives at verifySession, so the next request looks signed out.",
    },
    quiz: [
      {
        question: "Which file configures the session cookie attributes?",
        options: ["src/lib/auth.ts", "src/components/login-button.tsx", "package.json"],
        correctIndex: 0,
        why: "src/lib/auth.ts sets the session cookie.",
      },
    ],
    gekoTip: "Check `src/lib/auth.ts` first before changing UI code.",
  };

  it("accepts a clean debug output matching allowed files and sets xp: 30", () => {
    const result = normalizeDebugOutput(validRaw, allowed);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.xp).toBe(30);
    expect(result.value.likelyCauses.length).toBe(2);
    expect(result.value.fixSteps.length).toBe(3);
    expect(result.value.quiz.length).toBe(1);
    expect(result.value.dataPath.steps.length).toBe(3);
    expect(result.value.dataPath.breaksAt).toContain("verifySession");
  });

  it("rejects a data path hop that lands on a file outside the snapshot", () => {
    const invalid = {
      ...validRaw,
      dataPath: {
        ...validRaw.dataPath,
        steps: [
          validRaw.dataPath.steps[0],
          {
            from: "signInAction",
            to: "database",
            file: "src/db/imaginary.ts",
            whatHappens: "The write disappears here.",
          },
          validRaw.dataPath.steps[2],
        ],
      },
    };

    const result = normalizeDebugOutput(invalid, allowed);
    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.problems.some((p) => p.includes("src/db/imaginary.ts"))).toBe(true);
  });

  it("rejects a data path that never leaves one file", () => {
    const invalid = {
      ...validRaw,
      dataPath: {
        ...validRaw.dataPath,
        steps: [
          { ...validRaw.dataPath.steps[0], file: "src/lib/auth.ts" },
          { ...validRaw.dataPath.steps[1], file: "src/lib/auth.ts" },
          { ...validRaw.dataPath.steps[2], file: "src/lib/auth.ts" },
        ],
      },
    };

    const result = normalizeDebugOutput(invalid, allowed);
    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.problems.some((p) => p.includes("distinct files"))).toBe(true);
  });

  it("rejects a data path with fewer than three hops", () => {
    const invalid = {
      ...validRaw,
      dataPath: {
        ...validRaw.dataPath,
        steps: [validRaw.dataPath.steps[0], validRaw.dataPath.steps[2]],
      },
    };

    const result = normalizeDebugOutput(invalid, allowed);
    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.problems.some((p) => p.includes("data path hops"))).toBe(true);
  });

  it("rejects an invented backticked path in a data path hop", () => {
    const invalid = {
      ...validRaw,
      dataPath: {
        ...validRaw.dataPath,
        steps: [
          validRaw.dataPath.steps[0],
          {
            ...validRaw.dataPath.steps[1],
            whatHappens: "The write is dropped in `src/lib/ghost.ts`.",
          },
          validRaw.dataPath.steps[2],
        ],
      },
    };

    const result = normalizeDebugOutput(invalid, allowed);
    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.problems.some((p) => p.includes("src/lib/ghost.ts"))).toBe(true);
  });

  it("rejects invented evidenceFiles not present in the snapshot", () => {
    const invalid = {
      ...validRaw,
      likelyCauses: [
        {
          cause: "The imaginary file is broken.",
          evidenceFiles: ["src/nonexistent/service.ts"],
          confidence: "high",
        },
        ...validRaw.likelyCauses,
      ],
    };

    const result = normalizeDebugOutput(invalid, allowed);
    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.problems.some((p) => p.includes("not in this repository's snapshot"))).toBe(true);
  });

  it("rejects invented backticked paths in fixSteps", () => {
    const invalid = {
      ...validRaw,
      fixSteps: [
        "Step 1: Edit `src/imaginary/missing.ts`",
        "Step 2: Check `src/lib/auth.ts`",
        "Step 3: Test everything",
      ],
    };

    const result = normalizeDebugOutput(invalid, allowed);
    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.problems.some((p) => p.includes("src/imaginary/missing.ts"))).toBe(true);
  });

  it("rejects invalid quiz correctIndex or duplicate options", () => {
    const invalid = {
      ...validRaw,
      quiz: [
        {
          question: "Which file is it?",
          options: ["src/lib/auth.ts", "src/lib/auth.ts", "src/components/login-button.tsx"],
          correctIndex: 5, // out of range
          why: "...",
        },
      ],
    };

    const result = normalizeDebugOutput(invalid, allowed);
    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.problems.some((p) => p.includes("correctIndex"))).toBe(true);
  });
});

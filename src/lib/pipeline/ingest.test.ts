import { describe, expect, it } from "vitest";
import {
  MAX_FILE_BYTES,
  MAX_FILE_CHARS,
  MAX_FILES,
  MAX_TOTAL_CHARS,
  TRUNCATION_MARKER,
  excludedReason,
  filePriority,
  normalizeRepoUrl,
  parseRepoUrl,
  selectSnapshotFiles,
  truncateContent,
  type BlobEntry,
} from "./ingest";

function file(path: string, size = 100): BlobEntry {
  return { path, size };
}

describe("parseRepoUrl", () => {
  it("accepts public GitHub repository roots", () => {
    expect(parseRepoUrl("https://github.com/vercel/next.js")).toEqual({
      owner: "vercel",
      repo: "next.js",
    });
    expect(parseRepoUrl("github.com/owner/repo/")).toEqual({ owner: "owner", repo: "repo" });
    expect(parseRepoUrl("https://www.github.com/owner/repo.git")).toEqual({
      owner: "owner",
      repo: "repo",
    });
  });

  it("rejects other hosts, tree URLs and junk", () => {
    expect(parseRepoUrl("https://gitlab.com/owner/repo")).toBeNull();
    expect(parseRepoUrl("https://github.com/owner/repo/tree/main")).toBeNull();
    expect(parseRepoUrl("https://github.com/owner")).toBeNull();
    expect(parseRepoUrl("not a url")).toBeNull();
    expect(parseRepoUrl("")).toBeNull();
  });

  it("normalizes to a canonical URL", () => {
    const ref = parseRepoUrl("https://github.com/owner/repo.git");
    expect(ref && normalizeRepoUrl(ref)).toBe("https://github.com/owner/repo");
  });
});

describe("excludedReason", () => {
  it("drops dependencies, build output and lockfiles", () => {
    expect(excludedReason("node_modules/react/index.js", 10)).toBe("directory");
    expect(excludedReason(".next/server/page.js", 10)).toBe("directory");
    expect(excludedReason("dist/app.js", 10)).toBe("directory");
    expect(excludedReason("package-lock.json", 10)).toBe("lockfile");
    expect(excludedReason("bun.lockb", 10)).toBe("lockfile");
  });

  it("drops environment files, binaries and oversized blobs", () => {
    expect(excludedReason(".env.local", 10)).toBe("env");
    expect(excludedReason("public/logo.png", 10)).toBe("binary");
    expect(excludedReason("README.md", MAX_FILE_BYTES + 1)).toBe("oversize");
    expect(excludedReason("README.md", MAX_FILE_BYTES)).toBeNull();
  });

  it("keeps ordinary source files", () => {
    expect(excludedReason("src/app/page.tsx", 2_000)).toBeNull();
    expect(excludedReason("package.json", 500)).toBeNull();
  });
});

describe("filePriority", () => {
  it("follows the blueprint order", () => {
    expect(filePriority("package.json")).toBe(1);
    expect(filePriority("tsconfig.json")).toBe(2);
    expect(filePriority("app/dashboard/page.tsx")).toBe(3);
    expect(filePriority("pages/index.tsx")).toBe(3);
    expect(filePriority("prisma/schema.prisma")).toBe(4);
    expect(filePriority("lib/firebase/admin.ts")).toBe(5);
    expect(filePriority("README.md")).toBe(6);
    expect(filePriority("app/layout.tsx")).toBe(7);
    expect(filePriority("components/nav.tsx")).toBe(7);
    expect(filePriority("src/random.ts")).toBe(8);
  });
});

describe("selectSnapshotFiles", () => {
  it("puts manifests before pages, the README and loose source", () => {
    const selected = selectSnapshotFiles([
      file("src/random.ts"),
      file("README.md"),
      file("app/page.tsx"),
      file("package.json"),
    ]);

    expect(selected.map((entry) => entry.path)).toEqual([
      "package.json",
      "app/page.tsx",
      "README.md",
      "src/random.ts",
    ]);
  });

  it("keeps only the first two Supabase migrations", () => {
    const entries = [
      file("supabase/migrations/001_init.sql"),
      file("supabase/migrations/002_users.sql"),
      file("supabase/migrations/003_orders.sql"),
    ];

    expect(selectSnapshotFiles(entries).map((entry) => entry.path)).toEqual([
      "supabase/migrations/001_init.sql",
      "supabase/migrations/002_users.sql",
    ]);
  });

  it("caps the snapshot at 60 files", () => {
    const entries = Array.from({ length: MAX_FILES + 5 }, (_, index) =>
      file(`src/file-${String(index).padStart(3, "0")}.ts`, 10),
    );

    expect(selectSnapshotFiles(entries)).toHaveLength(MAX_FILES);
  });

  it("stops at the 150k character budget", () => {
    const entries = Array.from({ length: 20 }, (_, index) =>
      file(`src/file-${String(index).padStart(2, "0")}.ts`, 10_000),
    );

    const selected = selectSnapshotFiles(entries);
    expect(selected).toHaveLength(MAX_TOTAL_CHARS / 10_000);
  });

  it("adds the root layout before the five largest components", () => {
    const entries = [
      file("app/layout.tsx", 50),
      ...["a", "b", "c", "d", "e", "f"].map((name, index) =>
        file(`components/${name}.tsx`, (index + 1) * 100),
      ),
    ];

    expect(selectSnapshotFiles(entries).map((entry) => entry.path)).toEqual([
      "app/layout.tsx",
      "components/f.tsx",
      "components/e.tsx",
      "components/d.tsx",
      "components/c.tsx",
      "components/b.tsx",
    ]);
  });

  it("never selects excluded files", () => {
    const selected = selectSnapshotFiles([
      file("node_modules/react/index.js"),
      file("public/hero.png"),
      file("package-lock.json"),
      file("src/app/page.tsx"),
    ]);

    expect(selected.map((entry) => entry.path)).toEqual(["src/app/page.tsx"]);
  });
});

describe("truncateContent", () => {
  it("leaves short files untouched", () => {
    const result = truncateContent("const a = 1;");
    expect(result).toEqual({ content: "const a = 1;", truncated: false });
  });

  it("keeps head and tail with a visible marker", () => {
    const content = `HEAD${"x".repeat(30_000)}TAIL`;
    const result = truncateContent(content);

    expect(result.truncated).toBe(true);
    expect(result.content).toHaveLength(MAX_FILE_CHARS);
    expect(result.content).toContain(TRUNCATION_MARKER);
    expect(result.content.startsWith("HEAD")).toBe(true);
    expect(result.content.endsWith("TAIL")).toBe(true);
  });
});

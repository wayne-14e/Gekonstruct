import "server-only";

import type { SnapshotDoc, Stack } from "@/lib/domain/project";
import { IngestError, fetchRepoFile, fetchRepoTree } from "@/lib/github";
import { selectSnapshotFiles, truncateContent, type RepoRef } from "@/lib/pipeline/ingest";
import { detectStack } from "@/lib/pipeline/stack";

export type IngestionResult = {
  snapshot: SnapshotDoc;
  stack: Stack;
  treeTruncated: boolean;
};

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= items.length) return;
      const item = items[index];
      if (item === undefined) return;
      results[index] = await worker(item);
    }
  });

  await Promise.all(workers);
  return results;
}

/**
 * Run the deterministic half of the pipeline: tree → selection → raw contents → stack.
 * Nothing is written here; the route owns Firestore so retries always overwrite cleanly.
 */
export async function runIngestion(repo: RepoRef): Promise<IngestionResult> {
  const tree = await fetchRepoTree(repo);

  const blobs = tree.tree.flatMap((entry) =>
    entry.type === "blob" ? [{ path: entry.path, size: entry.size ?? 0 }] : [],
  );

  const selected = selectSnapshotFiles(blobs);
  if (selected.length === 0) {
    throw new IngestError(
      "This repository has no files we can read. Binary-only and empty repos aren't supported.",
      "empty-snapshot",
      422,
    );
  }

  // Six at a time: enough to feel instant on a 60-file snapshot without hammering raw.
  const fetched = await mapLimit(selected, 6, async (entry) => {
    const raw = await fetchRepoFile(repo, entry.path);
    const { content, truncated } = truncateContent(raw);
    return { path: entry.path, size: entry.size, content, truncated };
  });

  const stack = detectStack(fetched.map(({ path, content }) => ({ path, content })));
  if (!stack) {
    throw new IngestError(
      "We couldn't recognize the stack. Gekonstruct needs a manifest (package.json, requirements.txt, pyproject.toml, go.mod or Cargo.toml) or recognizable source files.",
      "stack-not-recognized",
      422,
    );
  }

  const files = fetched.map(({ path, size, content }) => ({ path, size, content }));
  const snapshot: SnapshotDoc = {
    files,
    fetchedAt: Date.now(),
    totalChars: files.reduce((sum, file) => sum + file.content.length, 0),
    truncated: fetched.filter((file) => file.truncated).map((file) => file.path),
  };

  return { snapshot, stack, treeTruncated: tree.truncated ?? false };
}

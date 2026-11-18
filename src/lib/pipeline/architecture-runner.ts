import "server-only";

import type { Architecture } from "@/lib/domain/architecture";
import type { SnapshotDoc, Stack } from "@/lib/domain/project";
import { requestStructured } from "@/lib/llm";
import { normalizeArchitecture, realPathsFromSnapshot } from "@/lib/pipeline/architecture";
import {
  ARCHITECTURE_PROMPT_VERSION,
  ARCHITECTURE_SYSTEM_PROMPT,
  buildArchitectureUserPrompt,
} from "@/lib/prompts";

export type ArchitectureResult = {
  architecture: Architecture;
  attempts: number;
  model: string;
  promptVersion: string;
  droppedFileRefs: string[];
  trimmedCounts: string[];
  softWarnings: string[];
  includedFiles: number;
  includedChars: number;
};

/**
 * Stage `architecture`: one model call over the stored snapshot, validated against the
 * real paths. No Firestore here — the route owns writes so a retry overwrites cleanly.
 */
export async function runArchitecture(input: {
  owner: string;
  repo: string;
  stack: Stack | null;
  snapshot: SnapshotDoc;
}): Promise<ArchitectureResult> {
  const allowedPaths = realPathsFromSnapshot(input.snapshot.files);
  const { prompt, includedFiles, includedChars } = buildArchitectureUserPrompt({
    owner: input.owner,
    repo: input.repo,
    stack: input.stack,
    files: input.snapshot.files,
  });

  const result = await requestStructured({
    label: "architecture",
    system: ARCHITECTURE_SYSTEM_PROMPT,
    user: prompt,
    validate: (raw) => {
      const normalized = normalizeArchitecture(raw, allowedPaths);
      if (!normalized.ok) {
        return { ok: false, problems: normalized.problems };
      }
      return {
        ok: true,
        value: {
          architecture: normalized.value,
          droppedFileRefs: normalized.droppedFileRefs,
          trimmedCounts: normalized.trimmedCounts,
          softWarnings: normalized.softWarnings,
        },
      };
    },
  });

  return {
    architecture: result.value.architecture,
    attempts: result.attempts,
    model: result.model,
    promptVersion: ARCHITECTURE_PROMPT_VERSION,
    droppedFileRefs: result.value.droppedFileRefs,
    trimmedCounts: result.value.trimmedCounts,
    softWarnings: result.value.softWarnings,
    includedFiles,
    includedChars,
  };
}

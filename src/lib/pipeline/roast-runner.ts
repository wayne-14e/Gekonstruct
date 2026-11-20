import "server-only";

import type { SnapshotDoc, Stack } from "@/lib/domain/project";
import { requestStructured } from "@/lib/llm";
import { normalizeRepoRoast, type RepoRoast } from "@/lib/pipeline/roast";
import {
  buildRoastUserPrompt,
  ROAST_PROMPT_VERSION,
  ROAST_SYSTEM_PROMPT,
} from "@/lib/prompts";

export async function runRepoRoast(input: {
  owner: string;
  repo: string;
  stack: Stack | null;
  snapshot: SnapshotDoc;
}): Promise<{
  roast: RepoRoast;
  attempts: number;
  model: string;
  promptVersion: string;
}> {
  const allowedPaths = input.snapshot.files.map((file) => file.path);
  const { prompt } = buildRoastUserPrompt({
    owner: input.owner,
    repo: input.repo,
    stack: input.stack,
    files: input.snapshot.files,
  });

  const result = await requestStructured({
    label: "repo-roast",
    system: ROAST_SYSTEM_PROMPT,
    user: prompt,
    invalidOutputMessage:
      "Geko couldn't verify a sharp roast against this snapshot. Try again in a moment.",
    validate: (raw) => normalizeRepoRoast(raw, allowedPaths),
  });

  return {
    roast: result.value,
    attempts: result.attempts,
    model: result.model,
    promptVersion: ROAST_PROMPT_VERSION,
  };
}

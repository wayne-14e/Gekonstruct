import "server-only";

import type { GuidebookDoc } from "@/lib/domain/architecture";
import { type DebugSessionContent } from "@/lib/domain/debug";
import type { SnapshotFile, Stack } from "@/lib/domain/project";
import { requestStructured, type StructuredResult } from "@/lib/llm";
import { normalizeDebugOutput } from "@/lib/pipeline/debug";
import {
  buildDebugUserPrompt,
  DEBUG_PROMPT_VERSION,
  DEBUG_SYSTEM_PROMPT,
} from "@/lib/prompts";

export type RunDebugAnalysisInput = {
  owner: string;
  repo: string;
  symptom: string;
  stack: Stack | null;
  guidebook: GuidebookDoc;
  matchedFiles: SnapshotFile[];
  allSnapshotFiles: SnapshotFile[];
};

export type DebugAnalysisResult = {
  content: DebugSessionContent;
  attempts: number;
  model: string;
  promptVersion: string;
  includedFiles: number;
  includedChars: number;
};

export async function runDebugAnalysis(
  input: RunDebugAnalysisInput,
): Promise<DebugAnalysisResult> {
  const allowedPaths = new Set(input.allSnapshotFiles.map((f) => f.path));

  const { prompt, includedFiles, includedChars } = buildDebugUserPrompt({
    owner: input.owner,
    repo: input.repo,
    symptom: input.symptom,
    stack: input.stack,
    guidebook: input.guidebook,
    matchedFiles: input.matchedFiles,
    allowedPaths: input.allSnapshotFiles.map((f) => f.path),
  });

  const result: StructuredResult<DebugSessionContent> = await requestStructured<DebugSessionContent>({
    label: "debug",
    system: DEBUG_SYSTEM_PROMPT,
    user: prompt,
    invalidOutputMessage:
      "The AI couldn't analyze this symptom with verified evidence files. Try rephrasing the symptom or try again in a moment.",
    validate: (raw) => normalizeDebugOutput(raw, allowedPaths),
  });

  return {
    content: result.value,
    attempts: result.attempts,
    model: result.model,
    promptVersion: DEBUG_PROMPT_VERSION,
    includedFiles,
    includedChars,
  };
}

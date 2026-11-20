"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  recordOverviewSectionViewed,
  recordRequestStepUnderstood,
} from "@/lib/analytics";
import { getCurrentUser } from "@/lib/auth/session";
import { OverviewSectionSchema } from "@/lib/domain/event";
import { getGuidebook, getProject } from "@/lib/projects";

const MarkOverviewSectionInputSchema = z.object({
  projectId: z.string().trim().min(1).max(200),
  section: OverviewSectionSchema,
});

export type MarkOverviewSectionResult =
  | {
      ok: true;
      viewed: string[];
      badgeAwarded: boolean;
      complete: boolean;
    }
  | { ok: false; error: string };

/**
 * Reading progress for the architecture map (BLUEPRINT §7 / §13). The client tracker calls
 * this once per section that enters the viewport; the server owns the badge award.
 */
export async function markOverviewSectionViewed(
  input: unknown,
): Promise<MarkOverviewSectionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in to save your reading progress." };

  const parsed = MarkOverviewSectionInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "That map section was not recognised." };
  }

  const project = await getProject(parsed.data.projectId, user.uid);
  if (!project) return { ok: false, error: "Project not found." };

  try {
    const result = await recordOverviewSectionViewed({
      projectId: project.id,
      uid: user.uid,
      section: parsed.data.section,
    });

    revalidatePath(`/projects/${project.id}`);
    revalidatePath(`/projects/${project.id}/overview`);
    return { ok: true, ...result };
  } catch (error) {
    console.error("markOverviewSectionViewed failed", error);
    return { ok: false, error: "We couldn't save your reading progress. Try again." };
  }
}

const MarkRequestStepInputSchema = z.object({
  projectId: z.string().trim().min(1).max(200),
  stepIndex: z.number().int().nonnegative(),
});

export type MarkRequestStepResult =
  | { ok: true; understoodSteps: number[] }
  | { ok: false; error: string };

export async function markRequestStepUnderstood(
  input: unknown,
): Promise<MarkRequestStepResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in to save your request progress." };

  const parsed = MarkRequestStepInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "That request step was not recognised." };

  const project = await getProject(parsed.data.projectId, user.uid);
  if (!project) return { ok: false, error: "Project not found." };

  const guidebook = await getGuidebook(project.id);
  if (!guidebook) return { ok: false, error: "This project doesn't have a request map yet." };

  const totalSteps = guidebook.architecture.dataFlow.length;
  if (parsed.data.stepIndex >= totalSteps) {
    return { ok: false, error: "That request step was not recognised." };
  }

  try {
    const result = await recordRequestStepUnderstood({
      projectId: project.id,
      uid: user.uid,
      stepIndex: parsed.data.stepIndex,
      totalSteps,
    });
    if (!result.accepted) {
      return { ok: false, error: "Complete the request steps in order." };
    }

    revalidatePath(`/projects/${project.id}/overview`);
    return { ok: true, understoodSteps: result.understoodSteps };
  } catch (error) {
    console.error("markRequestStepUnderstood failed", error);
    return { ok: false, error: "We couldn't save that step. Try again." };
  }
}

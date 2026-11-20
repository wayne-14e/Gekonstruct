"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { recordOverviewSectionViewed } from "@/lib/analytics";
import { getCurrentUser } from "@/lib/auth/session";
import { OverviewSectionSchema } from "@/lib/domain/event";
import { getProject } from "@/lib/projects";

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

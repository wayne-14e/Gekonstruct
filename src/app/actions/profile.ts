"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { adminDb } from "@/lib/firebase/admin";
import { userDocRef } from "@/lib/auth/users";
import { UserDocSchema } from "@/lib/domain/user";

export type ProfileActionResult = { ok: true } | { ok: false; error: string };

const DisplayNameSchema = z.string().trim().min(1).max(60);
const ClearConfirmationSchema = z.literal("DELETE");

export async function updateDisplayNameAction(input: unknown): Promise<ProfileActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in to update your profile." };

  const parsedName = DisplayNameSchema.safeParse(input);
  if (!parsedName.success) {
    return { ok: false, error: "Enter a name between 1 and 60 characters." };
  }

  try {
    const ref = userDocRef(user.uid);
    const snap = await ref.get();
    if (!snap.exists || !UserDocSchema.safeParse(snap.data()).success) {
      return { ok: false, error: "Your profile could not be loaded. Please sign in again." };
    }

    await ref.update({ displayName: parsedName.data });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    console.error("updateDisplayNameAction failed", error);
    return { ok: false, error: "We couldn't save your name. Please try again." };
  }
}

/**
 * Resets learning progress for the verified session user without deleting projects.
 *
 * What is cleared:
 *   - `projects/{pid}/progress/{uid}` for each owned project (pathway progress,
 *     lesson/quiz completions, overview sections, understood steps, XP, badges within progress)
 *   - `users/{uid}.totalXp` and `users/{uid}.badges`
 *
 * What is intentionally preserved:
 *   - Project documents themselves (projects stay on the projects page)
 *   - Snapshots, guidebooks, lessons — all pipeline output remains
 *   - `projects/{pid}/debugSessions/*` — debug analyses stay (users can re-read them)
 *   - `users/{uid}/debugUsage/{pid}` — debug session quota is NOT restored, so reset
 *     cannot be used to generate unlimited debug sessions
 *   - `users/{uid}.projectsCreatedCount` — the lifetime cap is never reset
 */
export async function clearUserProgressAction(input: unknown): Promise<ProfileActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in to clear your progress." };
  if (!ClearConfirmationSchema.safeParse(input).success) {
    return { ok: false, error: "Confirm the reset before continuing." };
  }

  try {
    const db = adminDb();
    const ownedProjects = await db
      .collection("projects")
      .where("ownerUid", "==", user.uid)
      .get();

    // Delete only the per-user progress document for each project.
    // All other subcollections (snapshot, guidebook, lessons, debugSessions) are preserved.
    for (const project of ownedProjects.docs) {
      await project.ref.collection("progress").doc(user.uid).delete();
    }

    await userDocRef(user.uid).update({ totalXp: 0, badges: [] });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    console.error("clearUserProgressAction failed", error);
    return {
      ok: false,
      error: "The reset did not finish. Please try again.",
    };
  }
}

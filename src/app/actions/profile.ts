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
 * Removes only projects owned by the verified session user, including their subcollections.
 * The profile and authentication account remain available for a fresh start.
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

    for (const project of ownedProjects.docs) {
      await db.recursiveDelete(project.ref);
    }

    await db.recursiveDelete(userDocRef(user.uid).collection("debugUsage"));
    await userDocRef(user.uid).update({ totalXp: 0, badges: [] });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    console.error("clearUserProgressAction failed", error);
    return {
      ok: false,
      error:
        "The reset did not finish. Some projects may already be erased; try again to remove any remaining data.",
    };
  }
}

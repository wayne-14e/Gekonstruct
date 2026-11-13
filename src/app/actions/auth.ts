"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSession, destroySession } from "@/lib/auth/session";
import { ensureUserDoc } from "@/lib/auth/users";

export type AuthActionResult = { ok: true } | { ok: false; error: string };

const SignInInputSchema = z.object({
  idToken: z.string().min(20),
});

/**
 * Called once per Google sign-in with a fresh Firebase ID token. Verifies the token,
 * provisions `users/{uid}` and swaps it for an httpOnly session cookie.
 */
export async function signInAction(input: unknown): Promise<AuthActionResult> {
  const parsed = SignInInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Sign-in payload was invalid. Please try again." };
  }

  try {
    const user = await createSession(parsed.data.idToken);
    await ensureUserDoc(user);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code: unknown }).code)
        : "";
    if (code.includes("id-token-expired") || code.includes("session-cookie-expired")) {
      return { ok: false, error: "That sign-in took too long. Please try again." };
    }
    if (code.includes("user-disabled")) {
      return { ok: false, error: "This account is disabled." };
    }
    console.error("signInAction failed", error);
    return { ok: false, error: "We could not complete sign-in. Please try again." };
  }
}

export async function signOutAction(): Promise<{ ok: true }> {
  await destroySession();
  revalidatePath("/", "layout");
  return { ok: true };
}

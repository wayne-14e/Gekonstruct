import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { adminAuth } from "@/lib/firebase/admin";

export const SESSION_COOKIE = "geko_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14; // 14 days

export type SessionUser = {
  uid: string;
  email: string | null;
  displayName: string;
  photoURL: string | null;
};

/**
 * Exchange a freshly minted Firebase ID token for an httpOnly session cookie.
 * Returns the verified profile so the caller can provision `users/{uid}`.
 */
export async function createSession(idToken: string): Promise<SessionUser> {
  const decoded = await adminAuth().verifyIdToken(idToken, true);
  const expiresIn = SESSION_MAX_AGE_SECONDS * 1000;
  const sessionCookie = await adminAuth().createSessionCookie(idToken, { expiresIn });

  const store = await cookies();
  store.set(SESSION_COOKIE, sessionCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  return {
    uid: decoded.uid,
    email: decoded.email ?? null,
    displayName: decoded.name ?? decoded.email?.split("@")[0] ?? "Vibe-coder",
    photoURL: decoded.picture ?? null,
  };
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** Verified session user for this request, or null. Cached per request. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const decoded = await adminAuth().verifySessionCookie(token, true);
    return {
      uid: decoded.uid,
      email: decoded.email ?? null,
      displayName: decoded.name ?? decoded.email?.split("@")[0] ?? "Vibe-coder",
      photoURL: decoded.picture ?? null,
    };
  } catch {
    // Expired, revoked or tampered cookie — treat as signed out.
    return null;
  }
});

/** For pages: signed-out visitors go to /login. */
export async function requireUser(nextPath?: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login");
  }
  return user;
}

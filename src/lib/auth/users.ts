import "server-only";

import { emptyUserDoc, UserDocSchema, type UserDoc } from "@/lib/domain/user";
import { adminDb } from "@/lib/firebase/admin";

export function userDocRef(uid: string) {
  return adminDb().doc(`users/${uid}`);
}

/** Profile for rendering, or null when the doc has not been created yet. */
export async function getUserProfile(uid: string): Promise<UserDoc | null> {
  const snap = await userDocRef(uid).get();
  if (!snap.exists) return null;
  const parsed = UserDocSchema.safeParse(snap.data());
  return parsed.success ? parsed.data : null;
}

/**
 * Create the profile on first sign-in, refresh the mutable display fields after that.
 * A transaction keeps `totalXp`/`badges` from being reset by a later sign-in.
 */
export async function ensureUserDoc(profile: {
  uid: string;
  email: string | null;
  displayName: string;
  photoURL: string | null;
}): Promise<void> {
  const ref = userDocRef(profile.uid);

  await adminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) {
      tx.set(ref, emptyUserDoc(profile));
      return;
    }
    const data = emptyUserDoc(profile);
    tx.update(ref, {
      email: data.email,
      displayName: data.displayName,
      photoURL: data.photoURL,
    });
  });
}

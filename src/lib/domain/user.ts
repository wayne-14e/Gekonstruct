import { z } from "zod";

/**
 * Firestore `users/{uid}`. Timestamps are epoch millis numbers everywhere in
 * Gekonstruct (see PROJECT_CONTEXT decisions) so server, rules and client agree.
 */
export const UserDocSchema = z.object({
  email: z.string().nullable(),
  displayName: z.string(),
  photoURL: z.string().nullable(),
  totalXp: z.number().int().nonnegative(),
  badges: z.array(z.string()),
  createdAt: z.number().int().nonnegative(),
  /**
   * Lifetime count of projects ever connected by this user. Never decremented
   * on delete so the 3-project cap cannot be bypassed by deleting and re-adding.
   */
  projectsCreatedCount: z.number().int().nonnegative().default(0),
});

export type UserDoc = z.infer<typeof UserDocSchema>;

export function emptyUserDoc(input: {
  email: string | null;
  displayName: string;
  photoURL: string | null;
}): UserDoc {
  return {
    email: input.email,
    displayName: input.displayName,
    photoURL: input.photoURL,
    totalXp: 0,
    badges: [],
    createdAt: Date.now(),
    projectsCreatedCount: 0,
  };
}

import "server-only";

import { userDocRef } from "@/lib/auth/users";
import {
  DebugSessionDocSchema,
  DebugUsageDocSchema,
  type DebugSessionDoc,
} from "@/lib/domain/debug";
import { projectDocRef } from "@/lib/projects";

export function debugSessionsCollectionRef(projectId: string) {
  return projectDocRef(projectId).collection("debugSessions");
}

export function debugSessionDocRef(projectId: string, sessionId: string) {
  return debugSessionsCollectionRef(projectId).doc(sessionId);
}

export function debugUsageDocRef(uid: string, projectId: string) {
  return userDocRef(uid).collection("debugUsage").doc(projectId);
}

export async function getDebugSessionsUsed(uid: string, projectId: string): Promise<number> {
  const snap = await debugUsageDocRef(uid, projectId).get();
  if (!snap.exists) return 0;

  const parsed = DebugUsageDocSchema.safeParse(snap.data());
  if (!parsed.success || parsed.data.projectId !== projectId) {
    throw new Error(`Debug usage data is invalid for project ${projectId}.`);
  }
  return parsed.data.sessionsUsed;
}

/**
 * List all debug sessions for a project, newest first.
 */
export async function listDebugSessions(projectId: string): Promise<DebugSessionDoc[]> {
  const snap = await debugSessionsCollectionRef(projectId).get();

  return snap.docs
    .flatMap((doc) => {
      const data = doc.data();
      const parsed = DebugSessionDocSchema.safeParse({ id: doc.id, projectId, ...data });
      return parsed.success ? [parsed.data] : [];
    })
    .sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Get a single debug session by id.
 */
export async function getDebugSession(
  projectId: string,
  sessionId: string,
): Promise<DebugSessionDoc | null> {
  const snap = await debugSessionDocRef(projectId, sessionId).get();
  if (!snap.exists) return null;

  const parsed = DebugSessionDocSchema.safeParse({ id: snap.id, projectId, ...snap.data() });
  return parsed.success ? parsed.data : null;
}

import "server-only";

import { DebugSessionDocSchema, type DebugSessionDoc } from "@/lib/domain/debug";
import { projectDocRef } from "@/lib/projects";

export function debugSessionsCollectionRef(projectId: string) {
  return projectDocRef(projectId).collection("debugSessions");
}

export function debugSessionDocRef(projectId: string, sessionId: string) {
  return debugSessionsCollectionRef(projectId).doc(sessionId);
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

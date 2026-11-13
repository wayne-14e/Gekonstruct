import "server-only";

import {
  ProjectDocSchema,
  SnapshotDocSchema,
  type ProjectDoc,
  type SnapshotDoc,
} from "@/lib/domain/project";
import { adminDb } from "@/lib/firebase/admin";

export type ProjectRecord = ProjectDoc & { id: string };

export function projectDocRef(projectId: string) {
  return adminDb().collection("projects").doc(projectId);
}

/**
 * `projects/{pid}/snapshot` is a single document, so Firestore needs a document id.
 * Gekonstruct uses `main` everywhere a blueprint singleton is stored.
 */
export function snapshotDocRef(projectId: string) {
  return projectDocRef(projectId).collection("snapshot").doc("main");
}

function toRecord(id: string, data: unknown): ProjectRecord | null {
  const parsed = ProjectDocSchema.safeParse(data);
  return parsed.success ? { id, ...parsed.data } : null;
}

/**
 * Three projects per user, so sorting in memory avoids a composite index and an extra
 * Firestore round-trip for a list that can never be long.
 */
export async function listProjects(ownerUid: string): Promise<ProjectRecord[]> {
  const snap = await adminDb().collection("projects").where("ownerUid", "==", ownerUid).get();

  return snap.docs
    .map((doc) => toRecord(doc.id, doc.data()))
    .filter((project): project is ProjectRecord => project !== null)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getProject(projectId: string, ownerUid: string): Promise<ProjectRecord | null> {
  const snap = await projectDocRef(projectId).get();
  if (!snap.exists) return null;

  const project = toRecord(snap.id, snap.data());
  if (!project || project.ownerUid !== ownerUid) return null;
  return project;
}

export async function getSnapshot(projectId: string): Promise<SnapshotDoc | null> {
  const snap = await snapshotDocRef(projectId).get();
  if (!snap.exists) return null;

  const parsed = SnapshotDocSchema.safeParse(snap.data());
  return parsed.success ? parsed.data : null;
}

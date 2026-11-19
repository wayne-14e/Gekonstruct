import "server-only";

import { LessonDocSchema, type LessonDoc } from "@/lib/domain/lesson";
import { ProgressDocSchema, type ProgressDoc } from "@/lib/domain/progress";
import { projectDocRef } from "@/lib/projects";

export function lessonsCollectionRef(projectId: string) {
  return projectDocRef(projectId).collection("lessons");
}

export function lessonDocRef(projectId: string, lessonId: string) {
  return lessonsCollectionRef(projectId).doc(lessonId);
}

export function progressDocRef(projectId: string, uid: string) {
  return projectDocRef(projectId).collection("progress").doc(uid);
}

/** All valid lessons for a project, ordered by the pathway sequence. */
export async function getLessons(projectId: string): Promise<LessonDoc[]> {
  const snap = await lessonsCollectionRef(projectId).get();

  return snap.docs
    .flatMap((doc) => {
      const parsed = LessonDocSchema.safeParse(doc.data());
      return parsed.success ? [parsed.data] : [];
    })
    .sort((a, b) => a.order - b.order);
}

export async function getLesson(projectId: string, lessonId: string): Promise<LessonDoc | null> {
  const snap = await lessonDocRef(projectId, lessonId).get();
  if (!snap.exists) return null;
  const parsed = LessonDocSchema.safeParse(snap.data());
  return parsed.success ? parsed.data : null;
}

export async function getProgress(projectId: string, uid: string): Promise<ProgressDoc | null> {
  const snap = await progressDocRef(projectId, uid).get();
  if (!snap.exists) return null;
  const parsed = ProgressDocSchema.safeParse(snap.data());
  return parsed.success ? parsed.data : null;
}

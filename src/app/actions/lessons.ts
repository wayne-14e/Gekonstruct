"use server";

import { revalidatePath } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { userDocRef } from "@/lib/auth/users";
import { addBadge, shouldAwardBadge } from "@/lib/badges";
import { emptyProgressDoc, ProgressDocSchema } from "@/lib/domain/progress";
import { adminDb } from "@/lib/firebase/admin";
import { getLesson, getLessons, progressDocRef } from "@/lib/lessons";
import { projectDocRef } from "@/lib/projects";
import {
  gekoLineForScore,
  gradeQuiz,
  lessonXpFor,
  pathwayBonusFor,
} from "@/lib/quiz";

const CompleteLessonInputSchema = z.object({
  projectId: z.string().trim().min(1).max(200),
  lessonId: z.string().trim().min(1).max(100),
  answers: z.array(z.number().int().min(0).max(3)).min(1).max(3),
});

export type CompleteLessonResult =
  | {
      ok: true;
      passed: boolean;
      alreadyPassed: boolean;
      score: number;
      correctCount: number;
      total: number;
      correct: boolean[];
      correctIndexes: number[];
      why: string[];
      xpAwarded: number;
      bonusXp: number;
      totalXp: number;
      pathwayComplete: boolean;
      badgeAwarded: boolean;
      gekoLine: string;
    }
  | { ok: false; error: string };

/**
 * Grade a lesson quiz on the server (BLUEPRINT §8). Answers are re-checked against the
 * stored quiz, XP is written once inside a transaction, and a failed attempt never removes
 * an earlier pass or awards XP.
 */
export async function completeLesson(input: unknown): Promise<CompleteLessonResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in to save your progress." };

  const parsedInput = CompleteLessonInputSchema.safeParse(input);
  if (!parsedInput.success) {
    return { ok: false, error: "That answer sheet was invalid. Reload the lesson and try again." };
  }

  const { projectId, lessonId, answers } = parsedInput.data;
  const projectRef = projectDocRef(projectId);
  const projectSnap = await projectRef.get();
  if (!projectSnap.exists) return { ok: false, error: "Project not found." };

  const projectData = projectSnap.data() as { ownerUid?: unknown } | undefined;
  if (projectData?.ownerUid !== user.uid) return { ok: false, error: "Project not found." };

  const [lesson, lessons] = await Promise.all([
    getLesson(projectId, lessonId),
    getLessons(projectId),
  ]);
  if (!lesson) return { ok: false, error: "That lesson doesn't exist any more. Reload the pathway." };
  if (lessons.length === 0) return { ok: false, error: "This pathway has no lessons yet." };
  if (answers.length !== lesson.quiz.length) {
    return { ok: false, error: "Answer every question before submitting." };
  }

  const grade = gradeQuiz(lesson.quiz, answers);
  const now = Date.now();
  const progressRef = progressDocRef(projectId, user.uid);
  const userRef = userDocRef(user.uid);
  const eventRef = projectRef.collection("events").doc();
  const pathwayEventRef = projectRef.collection("events").doc();

  try {
    const outcome = await adminDb().runTransaction(async (tx) => {
      const [progressSnap, userSnap] = await Promise.all([tx.get(progressRef), tx.get(userRef)]);

      const parsedProgress = progressSnap.exists
        ? ProgressDocSchema.safeParse(progressSnap.data())
        : null;
      const progress = parsedProgress?.success ? parsedProgress.data : emptyProgressDoc();
      const previous = progress.lessons[lesson.id];
      const alreadyPassed = previous?.passed === true;

      const nextEntry = {
        passed: alreadyPassed || grade.passed,
        score: Math.max(previous?.score ?? 0, grade.score),
        at: now,
      };
      const nextLessons = { ...progress.lessons, [lesson.id]: nextEntry };

      const passedCount = lessons.filter((item) => nextLessons[item.id]?.passed === true).length;
      const pathwayComplete = passedCount >= lessons.length;
      const bonusXp = pathwayBonusFor({
        alreadyAwarded: progress.pathwayBonusAwarded,
        passedCount,
        totalLessons: lessons.length,
      });
      const xpAwarded =
        lessonXpFor({
          passedNow: grade.passed,
          alreadyPassed,
          lessonXp: lesson.xp,
        }) + bonusXp;

      const currentTotalXp = userSnap.exists
        ? Number(userSnap.get("totalXp") ?? 0)
        : 0;

      const existingUserBadges: string[] = userSnap.exists
        ? ((userSnap.get("badges") as string[] | undefined) ?? [])
        : [];
      const badgeAwarded = shouldAwardBadge({
        owned: [...progress.badges, ...existingUserBadges],
        badge: "foundation-builder",
        condition: pathwayComplete,
      });
      const nextBadges = badgeAwarded
        ? addBadge(progress.badges, "foundation-builder")
        : progress.badges;

      tx.set(progressRef, {
        lessons: nextLessons,
        debug: progress.debug,
        badges: nextBadges,
        xp: progress.xp + xpAwarded,
        pathwayBonusAwarded: progress.pathwayBonusAwarded || bonusXp > 0,
        overviewSections: progress.overviewSections,
      });

      const userUpdate: Record<string, unknown> = {};
      if (xpAwarded > 0) {
        userUpdate.totalXp = FieldValue.increment(xpAwarded);
      }
      if (badgeAwarded) {
        userUpdate.badges = FieldValue.arrayUnion("foundation-builder");
      }
      if (Object.keys(userUpdate).length > 0) {
        tx.set(userRef, userUpdate, { merge: true });
      }

      tx.set(eventRef, {
        type: grade.passed ? "quiz_passed" : "quiz_failed",
        at: now,
        meta: {
          lessonId: lesson.id,
          score: grade.score,
          correctCount: grade.correctCount,
          total: grade.total,
          xpAwarded,
          bonusXp,
          pathwayComplete,
          badgeAwarded,
        },
      });
      if (bonusXp > 0) {
        tx.set(pathwayEventRef, {
          type: "pathway_completed",
          at: now,
          meta: {
            pathway: "foundations",
            lessonCount: lessons.length,
            bonusXp,
          },
        });
      }

      return {
        alreadyPassed,
        badgeAwarded,
        bonusXp,
        pathwayComplete,
        totalXp: currentTotalXp + xpAwarded,
        xpAwarded,
      };
    });

    revalidatePath(`/projects/${projectId}`);
    revalidatePath(`/projects/${projectId}/learn`);
    revalidatePath(`/projects/${projectId}/learn/${lesson.id}`);
    revalidatePath("/dashboard");

    return {
      ok: true,
      passed: grade.passed,
      alreadyPassed: outcome.alreadyPassed,
      score: grade.score,
      correctCount: grade.correctCount,
      total: grade.total,
      correct: grade.correct,
      correctIndexes: lesson.quiz.map((question) => question.correctIndex),
      why: lesson.quiz.map((question) => question.why),
      xpAwarded: outcome.xpAwarded,
      bonusXp: outcome.bonusXp,
      totalXp: outcome.totalXp,
      pathwayComplete: outcome.pathwayComplete,
      badgeAwarded: outcome.badgeAwarded,
      gekoLine: outcome.alreadyPassed
        ? "You already passed this lesson. A retry can't take the XP away — this one is yours."
        : gekoLineForScore(grade.score),
    };
  } catch (error) {
    console.error("completeLesson failed", error);
    return { ok: false, error: "We couldn't save your result. Try again in a moment." };
  }
}

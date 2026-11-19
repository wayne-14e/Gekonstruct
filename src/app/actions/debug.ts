"use server";

import { revalidatePath } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { userDocRef } from "@/lib/auth/users";
import { getDebugSession } from "@/lib/debug";
import { DEBUG_LIMITS } from "@/lib/domain/debug";
import { emptyProgressDoc, ProgressDocSchema } from "@/lib/domain/progress";
import { adminDb } from "@/lib/firebase/admin";
import { progressDocRef } from "@/lib/lessons";
import { projectDocRef } from "@/lib/projects";
import { gekoLineForScore, gradeQuiz } from "@/lib/quiz";

const CompleteDebugSessionInputSchema = z.object({
  projectId: z.string().trim().min(1).max(200),
  sessionId: z.string().trim().min(1).max(100),
  answers: z.array(z.number().int().min(0).max(3)).min(1).max(4),
});

export type CompleteDebugSessionResult =
  | {
      ok: true;
      passed: boolean;
      alreadyCompleted: boolean;
      score: number;
      correctCount: number;
      total: number;
      correct: boolean[];
      correctIndexes: number[];
      why: string[];
      xpAwarded: number;
      totalXp: number;
      badgeAwarded: boolean;
      gekoLine: string;
    }
  | { ok: false; error: string };

/**
 * Grade a debug session quiz and record completion (BLUEPRINT §7, §8).
 * Awards 30 XP on first pass inside a Firestore transaction, grants the "bug-whisperer"
 * badge on the first completed debug session, and records the `debug_completed` event.
 */
export async function completeDebugSession(input: unknown): Promise<CompleteDebugSessionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in to save your progress." };

  const parsedInput = CompleteDebugSessionInputSchema.safeParse(input);
  if (!parsedInput.success) {
    return { ok: false, error: "That answer sheet was invalid. Reload and try again." };
  }

  const { projectId, sessionId, answers } = parsedInput.data;
  const projectRef = projectDocRef(projectId);
  const projectSnap = await projectRef.get();
  if (!projectSnap.exists) return { ok: false, error: "Project not found." };

  const projectData = projectSnap.data() as { ownerUid?: unknown } | undefined;
  if (projectData?.ownerUid !== user.uid) return { ok: false, error: "Project not found." };

  const session = await getDebugSession(projectId, sessionId);
  if (!session || session.status !== "done" || !session.quiz || session.quiz.length === 0) {
    return { ok: false, error: "That debug session is not ready for grading." };
  }

  if (answers.length !== session.quiz.length) {
    return { ok: false, error: "Answer every question before submitting." };
  }

  const grade = gradeQuiz(session.quiz, answers);
  const now = Date.now();
  const progressRef = progressDocRef(projectId, user.uid);
  const userRef = userDocRef(user.uid);
  const eventRef = projectRef.collection("events").doc();

  try {
    const outcome = await adminDb().runTransaction(async (tx) => {
      const [progressSnap, userSnap] = await Promise.all([tx.get(progressRef), tx.get(userRef)]);

      const parsedProgress = progressSnap.exists
        ? ProgressDocSchema.safeParse(progressSnap.data())
        : null;
      const progress = parsedProgress?.success ? parsedProgress.data : emptyProgressDoc();

      const previous = progress.debug[sessionId];
      const alreadyCompleted = previous?.completed === true;

      const passedNow = grade.passed;
      const xpAwarded = passedNow && !alreadyCompleted ? (session.xp ?? DEBUG_LIMITS.xp) : 0;

      // Badge rule (BLUEPRINT §7): "bug-whisperer" on first completed debug session
      const existingUserBadges: string[] = userSnap.exists
        ? (userSnap.get("badges") as string[] | undefined) ?? []
        : [];
      const hasBadge =
        progress.badges.includes("bug-whisperer") ||
        existingUserBadges.includes("bug-whisperer");

      const badgeAwarded = passedNow && !hasBadge;

      const nextDebug = {
        ...progress.debug,
        [sessionId]: {
          completed: alreadyCompleted || passedNow,
          at: now,
        },
      };

      const nextBadges = badgeAwarded
        ? Array.from(new Set([...progress.badges, "bug-whisperer"]))
        : progress.badges;

      const currentTotalXp = userSnap.exists ? Number(userSnap.get("totalXp") ?? 0) : 0;

      tx.set(progressRef, {
        lessons: progress.lessons,
        debug: nextDebug,
        badges: nextBadges,
        xp: progress.xp + xpAwarded,
        pathwayBonusAwarded: progress.pathwayBonusAwarded,
      });

      const userUpdate: Record<string, unknown> = {};
      if (xpAwarded > 0) {
        userUpdate.totalXp = FieldValue.increment(xpAwarded);
      }
      if (badgeAwarded) {
        userUpdate.badges = FieldValue.arrayUnion("bug-whisperer");
      }
      if (Object.keys(userUpdate).length > 0) {
        tx.set(userRef, userUpdate, { merge: true });
      }

      tx.set(eventRef, {
        type: "debug_completed",
        at: now,
        meta: {
          sessionId,
          passed: passedNow,
          score: grade.score,
          correctCount: grade.correctCount,
          total: grade.total,
          xpAwarded,
          badgeAwarded,
        },
      });

      return {
        alreadyCompleted,
        xpAwarded,
        badgeAwarded,
        totalXp: currentTotalXp + xpAwarded,
      };
    });

    revalidatePath(`/projects/${projectId}`);
    revalidatePath(`/projects/${projectId}/debug`);
    revalidatePath(`/projects/${projectId}/debug/${sessionId}`);
    revalidatePath("/dashboard");

    return {
      ok: true,
      passed: grade.passed,
      alreadyCompleted: outcome.alreadyCompleted,
      score: grade.score,
      correctCount: grade.correctCount,
      total: grade.total,
      correct: grade.correct,
      correctIndexes: session.quiz.map((q) => q.correctIndex),
      why: session.quiz.map((q) => q.why),
      xpAwarded: outcome.xpAwarded,
      totalXp: outcome.totalXp,
      badgeAwarded: outcome.badgeAwarded,
      gekoLine: outcome.alreadyCompleted
        ? "You already completed this debug session. Retesting keeps your skills sharp — the XP is already yours."
        : grade.passed
          ? "Bug understood and verified. You found the cause and learned the principle behind it."
          : gekoLineForScore(grade.score),
    };
  } catch (error) {
    console.error("completeDebugSession failed", error);
    return { ok: false, error: "We couldn't save your debug result. Try again in a moment." };
  }
}

import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { userDocRef } from "@/lib/auth/users";
import { addBadge, shouldAwardBadge } from "@/lib/badges";
import {
  isOverviewComplete,
  isReturnVisitDue,
  lessonViewedEventId,
  mergeViewedSections,
  overviewSectionEventId,
  type AnalyticsEventType,
  type OverviewSection,
} from "@/lib/domain/event";
import {
  emptyProgressDoc,
  mergeUnderstoodRequestSteps,
  nextRequestStepIndex,
  ProgressDocSchema,
} from "@/lib/domain/progress";
import { adminDb } from "@/lib/firebase/admin";
import { progressDocRef } from "@/lib/lessons";
import { projectDocRef } from "@/lib/projects";

function eventsRef(projectId: string) {
  return projectDocRef(projectId).collection("events");
}

function isAlreadyExistsError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const code = "code" in error ? (error as { code?: unknown }).code : undefined;
  if (code === 6 || code === "already-exists" || code === "ALREADY_EXISTS") return true;
  const message = "message" in error ? String((error as { message?: unknown }).message) : "";
  return message.includes("ALREADY_EXISTS") || message.includes("already exists");
}

/**
 * Write an event at most once. A deterministic document id makes repeated page renders
 * and React strict-mode re-mounts harmless.
 */
export async function recordEventOnce(
  projectId: string,
  eventId: string,
  type: AnalyticsEventType,
  meta: Record<string, unknown> = {},
  at: number = Date.now(),
): Promise<boolean> {
  try {
    await eventsRef(projectId).doc(eventId).create({ type, at, meta });
    return true;
  } catch (error) {
    if (isAlreadyExistsError(error)) return false;
    throw error;
  }
}

/** `lesson_viewed` fires once per lesson per project (deterministic id). */
export async function recordLessonViewed(
  projectId: string,
  lessonId: string,
  order: number,
): Promise<boolean> {
  return recordEventOnce(projectId, lessonViewedEventId(lessonId), "lesson_viewed", {
    lessonId,
    order,
  });
}

/**
 * `return_visit` (BLUEPRINT §13): the first visit more than 24h after `analysis_ready`.
 * The deterministic `return_visit` doc makes it once-per-project.
 */
export async function recordReturnVisit(projectId: string): Promise<boolean> {
  const existing = await eventsRef(projectId).doc("return_visit").get();
  if (existing.exists) return false;

  const analysisReady = await eventsRef(projectId)
    .where("type", "==", "analysis_ready")
    .get();
  const analysisReadyAt = Math.min(
    ...analysisReady.docs
      .map((doc) => doc.get("at"))
      .filter((value): value is number => typeof value === "number"),
  );
  if (!Number.isFinite(analysisReadyAt) || !isReturnVisitDue(analysisReadyAt, Date.now())) {
    return false;
  }

  return recordEventOnce(projectId, "return_visit", "return_visit", {
    analysisReadyAt,
    hoursAfterAnalysis: Math.round((Date.now() - analysisReadyAt) / (60 * 60 * 1_000)),
  });
}

/**
 * Mark one overview section as read and award `map-reader` when all four are seen.
 * Progress, the user badge and both analytics events commit in one transaction.
 */
export async function recordOverviewSectionViewed(input: {
  projectId: string;
  uid: string;
  section: OverviewSection;
}): Promise<{ viewed: string[]; badgeAwarded: boolean; complete: boolean }> {
  const { projectId, uid, section } = input;
  const progressRef = progressDocRef(projectId, uid);
  const userRef = userDocRef(uid);
  const sectionEventRef = eventsRef(projectId).doc(overviewSectionEventId(section));
  const pathwayEventRef = eventsRef(projectId).doc();
  const now = Date.now();

  return adminDb().runTransaction(async (tx) => {
    const [progressSnap, userSnap, sectionEventSnap] = await Promise.all([
      tx.get(progressRef),
      tx.get(userRef),
      tx.get(sectionEventRef),
    ]);

    const parsedProgress = progressSnap.exists
      ? ProgressDocSchema.safeParse(progressSnap.data())
      : null;
    const progress = parsedProgress?.success ? parsedProgress.data : emptyProgressDoc();

    const userBadges: string[] = userSnap.exists
      ? ((userSnap.get("badges") as string[] | undefined) ?? [])
      : [];

    const viewed = mergeViewedSections(progress.overviewSections, section);
    const complete = isOverviewComplete(viewed);
    const badgeAwarded = shouldAwardBadge({
      owned: [...progress.badges, ...userBadges],
      badge: "map-reader",
      condition: complete,
    });
    const badges = badgeAwarded ? addBadge(progress.badges, "map-reader") : progress.badges;

    tx.set(progressRef, {
      lessons: progress.lessons,
      debug: progress.debug,
      badges,
      xp: progress.xp,
      pathwayBonusAwarded: progress.pathwayBonusAwarded,
      overviewSections: viewed,
      understoodRequestSteps: progress.understoodRequestSteps,
    });

    if (!sectionEventSnap.exists) {
      tx.set(sectionEventRef, {
        type: "overview_section_viewed",
        at: now,
        meta: { section },
      });
    }

    if (badgeAwarded) {
      tx.set(userRef, { badges: FieldValue.arrayUnion("map-reader") }, { merge: true });
      tx.set(pathwayEventRef, {
        type: "pathway_completed",
        at: now,
        meta: { pathway: "architecture", sections: viewed.length, badge: "map-reader" },
      });
    }

    return { viewed, badgeAwarded, complete };
  });
}

export async function recordRequestStepUnderstood(input: {
  projectId: string;
  uid: string;
  stepIndex: number;
  totalSteps: number;
}): Promise<{ understoodSteps: number[]; accepted: boolean }> {
  const { projectId, uid, stepIndex, totalSteps } = input;
  const progressRef = progressDocRef(projectId, uid);

  return adminDb().runTransaction(async (tx) => {
    const progressSnap = await tx.get(progressRef);
    const parsedProgress = progressSnap.exists
      ? ProgressDocSchema.safeParse(progressSnap.data())
      : null;
    const progress = parsedProgress?.success ? parsedProgress.data : emptyProgressDoc();
    const alreadyUnderstood = progress.understoodRequestSteps.includes(stepIndex);
    const nextStepIndex = nextRequestStepIndex(
      progress.understoodRequestSteps,
      totalSteps,
    );
    if (!alreadyUnderstood && stepIndex !== nextStepIndex) {
      return { understoodSteps: progress.understoodRequestSteps, accepted: false };
    }

    const understoodRequestSteps = mergeUnderstoodRequestSteps(
      progress.understoodRequestSteps,
      stepIndex,
      totalSteps,
    );

    if (!alreadyUnderstood) {
      tx.set(progressRef, { ...progress, understoodRequestSteps });
    }
    return { understoodSteps: understoodRequestSteps, accepted: true };
  });
}

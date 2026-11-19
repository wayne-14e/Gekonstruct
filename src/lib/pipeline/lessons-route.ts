import "server-only";

import { NextResponse } from "next/server";
import { z } from "zod";
import { GuidebookDocSchema } from "@/lib/domain/architecture";
import { LESSON_LIMITS, type Part } from "@/lib/domain/lesson";
import {
  ProjectDocSchema,
  SnapshotDocSchema,
  type ProjectStage,
} from "@/lib/domain/project";
import { getCurrentUser } from "@/lib/auth/session";
import { adminDb } from "@/lib/firebase/admin";
import { getLessons, lessonDocRef } from "@/lib/lessons";
import { LlmError } from "@/lib/llm";
import { runLessons } from "@/lib/pipeline/lessons-runner";
import { guidebookDocRef, projectDocRef, snapshotDocRef } from "@/lib/projects";

const BodySchema = z.object({
  projectId: z.string().trim().min(1).max(200),
});

const RUNNABLE_STAGES: Record<Part, ReadonlySet<ProjectStage>> = {
  1: new Set<ProjectStage>(["architecture", "lessons1", "failed:lessons1"]),
  2: new Set<ProjectStage>(["lessons1", "lessons2", "failed:lessons2"]),
};

/**
 * Shared implementation for `/api/pipeline/lessons1` and `/api/pipeline/lessons2`
 * (BLUEPRINT §8). Each part is an idempotent step that overwrites only its own lessons.
 */
export async function handleLessonsStage(request: Request, part: Part): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Sign in first." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Request body must be JSON." }, { status: 400 });
  }

  const parsedBody = BodySchema.safeParse(body);
  if (!parsedBody.success) {
    return NextResponse.json({ ok: false, error: "A project id is required." }, { status: 400 });
  }

  const projectRef = projectDocRef(parsedBody.data.projectId);
  const projectSnap = await projectRef.get();
  if (!projectSnap.exists) {
    return NextResponse.json({ ok: false, error: "Project not found." }, { status: 404 });
  }

  const parsedProject = ProjectDocSchema.safeParse(projectSnap.data());
  if (!parsedProject.success) {
    console.error("lessons: stored project is invalid", parsedProject.error.flatten());
    return NextResponse.json(
      { ok: false, error: "This project's stored data is invalid. Reconnect the repository." },
      { status: 500 },
    );
  }

  const project = parsedProject.data;
  if (project.ownerUid !== user.uid) {
    return NextResponse.json({ ok: false, error: "Project not found." }, { status: 404 });
  }

  if (!RUNNABLE_STAGES[part].has(project.stage)) {
    const error =
      part === 2 && project.stage === "architecture"
        ? "Write the first half of the lessons before finishing the pathway."
        : part === 2 && project.stage === "failed:lessons1"
          ? "The first half of the lessons failed. Retry part 1 first."
          : "This project has already moved past this lessons stage. Re-run the later stage instead.";
    return NextResponse.json({ ok: false, error }, { status: 409 });
  }

  const [snapshotSnap, guidebookSnap] = await Promise.all([
    snapshotDocRef(projectRef.id).get(),
    guidebookDocRef(projectRef.id).get(),
  ]);

  if (!snapshotSnap.exists) {
    return NextResponse.json(
      { ok: false, error: "The file snapshot is missing. Run ingestion again first." },
      { status: 409 },
    );
  }
  if (!guidebookSnap.exists) {
    return NextResponse.json(
      { ok: false, error: "The architecture map is missing. Build the map before writing lessons." },
      { status: 409 },
    );
  }

  const parsedSnapshot = SnapshotDocSchema.safeParse(snapshotSnap.data());
  if (!parsedSnapshot.success) {
    return NextResponse.json(
      { ok: false, error: "The stored snapshot is invalid. Run ingestion again." },
      { status: 500 },
    );
  }
  const parsedGuidebook = GuidebookDocSchema.safeParse(guidebookSnap.data());
  if (!parsedGuidebook.success) {
    return NextResponse.json(
      { ok: false, error: "The stored architecture map is invalid. Rebuild the map." },
      { status: 500 },
    );
  }

  const existingLessons = await getLessons(projectRef.id);
  const partOneLessons = existingLessons.filter((lesson) => lesson.part === 1);
  if (part === 2 && partOneLessons.length < 3) {
    return NextResponse.json(
      { ok: false, error: "Part 1 of the lessons is missing or incomplete. Run lessons1 again first." },
      { status: 409 },
    );
  }

  // Part 1 rebuilds the whole pathway; part 2 replaces only its own half.
  const lessonsToDelete =
    part === 1
      ? existingLessons
      : existingLessons.filter((lesson) => lesson.part === 2);

  try {
    const result = await runLessons({
      owner: project.owner,
      repo: project.repo,
      stack: project.stack,
      snapshot: parsedSnapshot.data,
      guidebook: parsedGuidebook.data,
      part,
      existingLessons: part === 2 ? partOneLessons : [],
    });

    const now = Date.now();
    const batch = adminDb().batch();
    const totalLessons = (part === 2 ? partOneLessons.length : 0) + result.lessons.length;

    for (const lesson of lessonsToDelete) {
      batch.delete(lessonDocRef(projectRef.id, lesson.id));
    }
    for (const lesson of result.lessons) {
      batch.set(lessonDocRef(projectRef.id, lesson.id), lesson);
    }

    const nextStage: ProjectStage = part === 1 ? "lessons1" : "ready";
    batch.update(projectRef, {
      stage: nextStage,
      stageError: null,
      updatedAt: now,
      // BLUEPRINT §8: lessons2 sets `ready` and the final lesson count.
      ...(part === 2 ? { lessonCount: totalLessons } : {}),
    });
    batch.set(projectRef.collection("events").doc(), {
      type: "stage_completed",
      at: now,
      meta: {
        stage: part === 1 ? "lessons1" : "lessons2",
        part,
        lessons: result.lessons.length,
        totalLessons,
        minTotal: LESSON_LIMITS.total.min,
        model: result.model,
        promptVersion: result.promptVersion,
        attempts: result.attempts,
        includedFiles: result.includedFiles,
        includedChars: result.includedChars,
        droppedCodeRefs: result.droppedCodeRefs,
        trimmedCounts: result.trimmedCounts,
        softWarnings: result.softWarnings,
      },
    });

    await batch.commit();

    console.info("lessons: stored", {
      projectId: projectRef.id,
      part,
      lessons: result.lessons.length,
      totalLessons,
      attempts: result.attempts,
      droppedCodeRefs: result.droppedCodeRefs,
      trimmedCounts: result.trimmedCounts,
      softWarnings: result.softWarnings,
    });

    return NextResponse.json({
      ok: true,
      stage: nextStage,
      part,
      lessons: result.lessons.length,
      totalLessons,
      attempts: result.attempts,
    });
  } catch (error) {
    const message =
      error instanceof LlmError
        ? error.message
        : "The lessons failed to build. Try again in a moment.";

    console.error(`lessons${part} failed for ${projectRef.id}`, error);

    const failedStage: ProjectStage = part === 1 ? "failed:lessons1" : "failed:lessons2";
    await projectRef
      .update({ stage: failedStage, stageError: message, updatedAt: Date.now() })
      .catch((updateError: unknown) => {
        console.error("lessons: could not record failure", updateError);
      });

    return NextResponse.json(
      { ok: false, error: message },
      { status: error instanceof LlmError ? error.httpStatus : 502 },
    );
  }
}

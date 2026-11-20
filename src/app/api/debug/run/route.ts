import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import {
  debugSessionsCollectionRef,
  debugUsageDocRef,
} from "@/lib/debug";
import {
  DEBUG_LIMITS,
  DebugUsageDocSchema,
  freeDebugSessionsRemaining,
} from "@/lib/domain/debug";
import { GuidebookDocSchema } from "@/lib/domain/architecture";
import { ProjectDocSchema, SnapshotDocSchema } from "@/lib/domain/project";
import { adminDb } from "@/lib/firebase/admin";
import { LlmError } from "@/lib/llm";
import { matchFilesBySymptom } from "@/lib/pipeline/debug";
import { runDebugAnalysis } from "@/lib/pipeline/debug-runner";
import { guidebookDocRef, projectDocRef, snapshotDocRef } from "@/lib/projects";

export const runtime = "nodejs";
export const maxDuration = 60;

const BodySchema = z.object({
  projectId: z.string().trim().min(1).max(200),
  symptom: z
    .string()
    .trim()
    .min(
      DEBUG_LIMITS.symptomMinChars,
      `Describe the symptom in at least ${DEBUG_LIMITS.symptomMinChars} characters.`,
    )
    .max(DEBUG_LIMITS.symptomMaxChars, "Symptom description is too long (max 2,000 characters)."),
});

export async function POST(request: Request) {
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
    const error = parsedBody.error.issues[0]?.message ?? "Invalid input.";
    return NextResponse.json({ ok: false, error }, { status: 400 });
  }

  const { projectId, symptom } = parsedBody.data;
  const projectRef = projectDocRef(projectId);
  const projectSnap = await projectRef.get();
  if (!projectSnap.exists) {
    return NextResponse.json({ ok: false, error: "Project not found." }, { status: 404 });
  }

  const parsedProject = ProjectDocSchema.safeParse(projectSnap.data());
  if (!parsedProject.success) {
    return NextResponse.json(
      { ok: false, error: "This project's stored data is invalid. Reconnect the repository." },
      { status: 500 },
    );
  }

  const project = parsedProject.data;
  if (project.ownerUid !== user.uid) {
    return NextResponse.json({ ok: false, error: "Project not found." }, { status: 404 });
  }

  const [snapshotSnap, guidebookSnap] = await Promise.all([
    snapshotDocRef(projectId).get(),
    guidebookDocRef(projectId).get(),
  ]);

  if (!snapshotSnap.exists) {
    return NextResponse.json(
      { ok: false, error: "File snapshot is missing. Ingest the repository first." },
      { status: 409 },
    );
  }
  if (!guidebookSnap.exists) {
    return NextResponse.json(
      { ok: false, error: "Architecture map is missing. Build the architecture map first." },
      { status: 409 },
    );
  }

  const parsedSnapshot = SnapshotDocSchema.safeParse(snapshotSnap.data());
  const parsedGuidebook = GuidebookDocSchema.safeParse(guidebookSnap.data());

  if (!parsedSnapshot.success || !parsedGuidebook.success) {
    return NextResponse.json(
      { ok: false, error: "Repository analysis data is corrupted. Re-run ingestion." },
      { status: 500 },
    );
  }

  const sessionRef = debugSessionsCollectionRef(projectId).doc();
  const sessionId = sessionRef.id;
  const now = Date.now();
  const usageRef = debugUsageDocRef(user.uid, projectId);

  let reservation: { ok: true } | { ok: false; reason: "limit" | "not-found" };
  try {
    reservation = await adminDb().runTransaction(async (tx) => {
      const [currentProject, usageSnap, existingSessions] = await Promise.all([
        tx.get(projectRef),
        tx.get(usageRef),
        tx.get(debugSessionsCollectionRef(projectId)),
      ]);

      if (!currentProject.exists || currentProject.get("ownerUid") !== user.uid) {
        return { ok: false, reason: "not-found" };
      }

      let sessionsUsed = existingSessions.size;
      if (usageSnap.exists) {
        const parsedUsage = DebugUsageDocSchema.safeParse(usageSnap.data());
        if (!parsedUsage.success || parsedUsage.data.projectId !== projectId) {
          throw new Error(`Debug usage data is invalid for project ${projectId}.`);
        }
        sessionsUsed = Math.max(sessionsUsed, parsedUsage.data.sessionsUsed);
      }

      if (freeDebugSessionsRemaining(sessionsUsed) === 0) {
        return { ok: false, reason: "limit" };
      }

      tx.set(usageRef, {
        projectId,
        sessionsUsed: sessionsUsed + 1,
        updatedAt: now,
      });
      tx.create(sessionRef, {
        id: sessionId,
        projectId,
        symptom,
        status: "pending",
        createdAt: now,
      });

      return { ok: true };
    });
  } catch (error) {
    console.error(`debug session reservation failed for project ${projectId}`, error);
    return NextResponse.json(
      { ok: false, error: "Could not reserve a debug session. Please try again." },
      { status: 500 },
    );
  }

  if (!reservation.ok) {
    if (reservation.reason === "not-found") {
      return NextResponse.json({ ok: false, error: "Project not found." }, { status: 404 });
    }
    return NextResponse.json(
      {
        ok: false,
        error: `The free plan allows ${DEBUG_LIMITS.freeSessionsPerProject} debug sessions per project, and this project has used them all.`,
      },
      { status: 429 },
    );
  }

  try {
    const matchedFiles = matchFilesBySymptom(parsedSnapshot.data.files, symptom, 10);

    const result = await runDebugAnalysis({
      owner: project.owner,
      repo: project.repo,
      symptom,
      stack: project.stack,
      guidebook: parsedGuidebook.data,
      matchedFiles,
      allSnapshotFiles: parsedSnapshot.data.files,
    });

    const completedAt = Date.now();

    await sessionRef.set({
      id: sessionId,
      projectId,
      symptom,
      status: "done",
      likelyCauses: result.content.likelyCauses,
      fixSteps: result.content.fixSteps,
      whyItWorks: result.content.whyItWorks,
      quiz: result.content.quiz,
      gekoTip: result.content.gekoTip,
      xp: result.content.xp,
      createdAt: now,
      analyzedAt: completedAt,
      model: result.model,
      promptVersion: result.promptVersion,
    });

    // Write debug_created event (BLUEPRINT §13)
    await projectRef.collection("events").add({
      type: "debug_created",
      at: completedAt,
      meta: {
        sessionId,
        symptom: symptom.slice(0, 160),
        causesCount: result.content.likelyCauses.length,
        fixStepsCount: result.content.fixSteps.length,
        matchedFilesCount: matchedFiles.length,
        matchedFiles: matchedFiles.map((f) => f.path),
        attempts: result.attempts,
        model: result.model,
        promptVersion: result.promptVersion,
      },
    });

    return NextResponse.json({
      ok: true,
      sessionId,
      causesCount: result.content.likelyCauses.length,
    });
  } catch (error) {
    const message =
      error instanceof LlmError
        ? error.message
        : "The debug analysis failed. Try again in a moment.";

    console.error(`debug session failed for project ${projectId}`, error);

    await sessionRef.update({
      status: "failed",
      error: message,
    }).catch((updateError) => {
      console.error("debug: could not record session failure", updateError);
    });

    return NextResponse.json(
      { ok: false, error: message, sessionId },
      { status: error instanceof LlmError ? error.httpStatus : 502 },
    );
  }
}

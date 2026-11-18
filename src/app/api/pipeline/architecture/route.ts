import { NextResponse } from "next/server";
import { z } from "zod";
import { ProjectDocSchema, SnapshotDocSchema } from "@/lib/domain/project";
import { getCurrentUser } from "@/lib/auth/session";
import { adminDb } from "@/lib/firebase/admin";
import { LlmError } from "@/lib/llm";
import { runArchitecture } from "@/lib/pipeline/architecture-runner";
import { guidebookDocRef, projectDocRef, snapshotDocRef } from "@/lib/projects";

export const runtime = "nodejs";
export const maxDuration = 60;

const BodySchema = z.object({
  projectId: z.string().trim().min(1).max(200),
});

const RUNNABLE_STAGES = new Set(["ingested", "architecture", "failed:architecture"]);

/**
 * Idempotent architecture step (BLUEPRINT §8). Re-POSTing overwrites `guidebook/main`
 * and returns the project to `architecture`. It refuses to run once a later stage has
 * consumed the guidebook, so lessons can never describe a map that has been replaced.
 */
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
    return NextResponse.json({ ok: false, error: "A project id is required." }, { status: 400 });
  }

  const projectRef = projectDocRef(parsedBody.data.projectId);
  const projectSnap = await projectRef.get();
  if (!projectSnap.exists) {
    return NextResponse.json({ ok: false, error: "Project not found." }, { status: 404 });
  }

  const parsedProject = ProjectDocSchema.safeParse(projectSnap.data());
  if (!parsedProject.success) {
    console.error("architecture: stored project is invalid", parsedProject.error.flatten());
    return NextResponse.json(
      { ok: false, error: "This project's stored data is invalid. Reconnect the repository." },
      { status: 500 },
    );
  }

  const project = parsedProject.data;
  if (project.ownerUid !== user.uid) {
    return NextResponse.json({ ok: false, error: "Project not found." }, { status: 404 });
  }

  if (!RUNNABLE_STAGES.has(project.stage)) {
    return NextResponse.json(
      {
        ok: false,
        error: "This project has already moved past the architecture map. Re-run the later stage instead.",
      },
      { status: 409 },
    );
  }

  const snapshotSnap = await snapshotDocRef(projectRef.id).get();
  if (!snapshotSnap.exists) {
    return NextResponse.json(
      { ok: false, error: "The file snapshot is missing. Run ingestion again first." },
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

  try {
    const result = await runArchitecture({
      owner: project.owner,
      repo: project.repo,
      stack: project.stack,
      snapshot: parsedSnapshot.data,
    });

    const now = Date.now();
    const batch = adminDb().batch();

    batch.set(guidebookDocRef(projectRef.id), {
      ...result.architecture,
      analyzedAt: now,
      model: result.model,
      promptVersion: result.promptVersion,
    });
    batch.update(projectRef, {
      stage: "architecture",
      stageError: null,
      updatedAt: now,
    });
    batch.set(projectRef.collection("events").doc(), {
      type: "stage_completed",
      at: now,
      meta: {
        stage: "architecture",
        model: result.model,
        promptVersion: result.promptVersion,
        attempts: result.attempts,
        layers: result.architecture.architecture.layers.length,
        concepts: result.architecture.concepts.length,
        includedFiles: result.includedFiles,
        includedChars: result.includedChars,
        droppedFileRefs: result.droppedFileRefs,
        softWarnings: result.softWarnings,
      },
    });
    batch.set(projectRef.collection("events").doc(), {
      type: "analysis_ready",
      at: now,
      meta: { projectId: projectRef.id },
    });

    await batch.commit();

    console.info("architecture: guidebook stored", {
      projectId: projectRef.id,
      attempts: result.attempts,
      layers: result.architecture.architecture.layers.length,
      concepts: result.architecture.concepts.length,
      droppedFileRefs: result.droppedFileRefs,
      trimmedCounts: result.trimmedCounts,
      softWarnings: result.softWarnings,
    });

    return NextResponse.json({
      ok: true,
      stage: "architecture",
      layers: result.architecture.architecture.layers.length,
      concepts: result.architecture.concepts.length,
      attempts: result.attempts,
    });
  } catch (error) {
    const message =
      error instanceof LlmError
        ? error.message
        : "The architecture map failed. Try again in a moment.";

    console.error(`architecture failed for ${projectRef.id}`, error);

    await projectRef
      .update({ stage: "failed:architecture", stageError: message, updatedAt: Date.now() })
      .catch((updateError: unknown) => {
        console.error("architecture: could not record failure", updateError);
      });

    return NextResponse.json(
      { ok: false, error: message },
      { status: error instanceof LlmError ? error.httpStatus : 502 },
    );
  }
}

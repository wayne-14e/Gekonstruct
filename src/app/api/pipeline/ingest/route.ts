import { NextResponse } from "next/server";
import { z } from "zod";
import { ProjectDocSchema } from "@/lib/domain/project";
import { getCurrentUser } from "@/lib/auth/session";
import { adminDb } from "@/lib/firebase/admin";
import { IngestError } from "@/lib/github";
import { parseRepoUrl } from "@/lib/pipeline/ingest";
import { runIngestion } from "@/lib/pipeline/ingest-runner";
import { snapshotDocRef } from "@/lib/projects";

export const runtime = "nodejs";
export const maxDuration = 60;

const BodySchema = z.object({
  projectId: z.string().trim().min(1).max(200),
});

const RUNNABLE_STAGES = new Set(["created", "ingested", "failed:ingested"]);

/**
 * Idempotent ingestion step (BLUEPRINT §8). Re-POSTing overwrites `snapshot/main` and
 * returns the project to `ingested`; it refuses to run once a later stage has produced
 * output, so a stale analysis can never quietly survive a fresh snapshot.
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

  const projectRef = adminDb().collection("projects").doc(parsedBody.data.projectId);
  const projectSnap = await projectRef.get();
  if (!projectSnap.exists) {
    return NextResponse.json({ ok: false, error: "Project not found." }, { status: 404 });
  }

  const parsedProject = ProjectDocSchema.safeParse(projectSnap.data());
  if (!parsedProject.success) {
    console.error("ingest: stored project is invalid", parsedProject.error.flatten());
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
        error: "This project has already moved past ingestion. Re-run the later stage instead.",
      },
      { status: 409 },
    );
  }

  const repo = parseRepoUrl(project.repoUrl);
  if (!repo) {
    return NextResponse.json(
      { ok: false, error: "The stored repository URL is invalid. Reconnect the repository." },
      { status: 422 },
    );
  }

  try {
    const result = await runIngestion(repo);
    const now = Date.now();
    const batch = adminDb().batch();

    batch.set(snapshotDocRef(projectRef.id), result.snapshot);
    batch.update(projectRef, {
      stack: result.stack,
      stage: "ingested",
      stageError: null,
      updatedAt: now,
    });
    batch.set(projectRef.collection("events").doc(), {
      type: "stage_completed",
      at: now,
      meta: {
        stage: "ingested",
        files: result.snapshot.files.length,
        totalChars: result.snapshot.totalChars,
        truncated: result.snapshot.truncated.length,
        treeTruncated: result.treeTruncated,
      },
    });

    await batch.commit();

    return NextResponse.json({
      ok: true,
      stage: "ingested",
      files: result.snapshot.files.length,
      totalChars: result.snapshot.totalChars,
    });
  } catch (error) {
    const message =
      error instanceof IngestError
        ? error.message
        : "Ingestion failed. Try again in a moment.";

    console.error(`ingest failed for ${projectRef.id}`, error);

    await projectRef
      .update({ stage: "failed:ingested", stageError: message, updatedAt: Date.now() })
      .catch((updateError: unknown) => {
        console.error("ingest: could not record failure", updateError);
      });

    return NextResponse.json(
      { ok: false, error: message },
      { status: error instanceof IngestError ? error.httpStatus : 502 },
    );
  }
}

"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  decideRepoRoastReservation,
  RepoRoastRecordSchema,
} from "@/lib/domain/repo-roast";
import {
  MAX_PROJECTS,
  ProjectDocSchema,
  SnapshotDocSchema,
  type ProjectDoc,
} from "@/lib/domain/project";
import { getCurrentUser } from "@/lib/auth/session";
import { adminDb } from "@/lib/firebase/admin";
import { normalizeRepoUrl, parseRepoUrl } from "@/lib/pipeline/ingest";
import { repoRoastDocRef } from "@/lib/projects";
import { runRepoRoast } from "@/lib/pipeline/roast-runner";
import { userDocRef } from "@/lib/auth/users";
import { UserDocSchema } from "@/lib/domain/user";

export type CreateProjectResult =
  | { ok: true; projectId: string }
  | { ok: false; error: string };

export type DeleteProjectResult =
  | { ok: true }
  | { ok: false; error: string };

export type RoastProjectResult =
  | { ok: true; quote: string; file: string }
  | { ok: false; error: string };

const RepoUrlInputSchema = z.string().trim().min(1).max(300);
const ProjectIdSchema = z.string().trim().min(1).max(200);

class ProjectLimitError extends Error {}

/**
 * Connect a public repo. The cap is enforced inside a transaction so two tabs can't race
 * past three projects, and the creation event is written in the same commit.
 */
export async function createProject(repoUrlInput: string): Promise<CreateProjectResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in to connect a repository." };

  const parsedInput = RepoUrlInputSchema.safeParse(repoUrlInput);
  if (!parsedInput.success) {
    return { ok: false, error: "Paste a public GitHub repository URL." };
  }

  const repo = parseRepoUrl(parsedInput.data);
  if (!repo) {
    return {
      ok: false,
      error: "Use the repository root URL, like https://github.com/owner/repo.",
    };
  }

  const db = adminDb();
  const projects = db.collection("projects");
  const projectRef = projects.doc();
  const now = Date.now();

  const doc: ProjectDoc = {
    ownerUid: user.uid,
    repoUrl: normalizeRepoUrl(repo),
    owner: repo.owner,
    repo: repo.repo,
    title: repo.repo,
    stage: "created",
    stageError: null,
    stack: null,
    createdAt: now,
    updatedAt: now,
    lessonCount: 0,
  };

  try {
    await db.runTransaction(async (tx) => {
      // Use the lifetime counter on users/{uid} so deleted projects still count.
      const userSnap = await tx.get(userDocRef(user.uid));
      const userParsed = UserDocSchema.safeParse(userSnap.data());
      const currentCount = userParsed.success
        ? userParsed.data.projectsCreatedCount
        : 0;
      if (currentCount >= MAX_PROJECTS) throw new ProjectLimitError();

      tx.set(projectRef, doc);
      tx.set(projectRef.collection("events").doc(), {
        type: "project_created",
        at: now,
        meta: { repoUrl: doc.repoUrl },
      });
      // Increment the lifetime counter atomically.
      tx.update(userDocRef(user.uid), {
        projectsCreatedCount: currentCount + 1,
      });
    });
  } catch (error) {
    if (error instanceof ProjectLimitError) {
      return {
        ok: false,
        error: `You've reached the ${MAX_PROJECTS}-project limit for this MVP.`,
      };
    }
    console.error("createProject failed", error);
    return { ok: false, error: "We couldn't create the project. Please try again." };
  }

  revalidatePath("/dashboard");
  return { ok: true, projectId: projectRef.id };
}

export async function deleteProjectAction(projectIdInput: unknown): Promise<DeleteProjectResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in to delete a project." };

  const parsedId = ProjectIdSchema.safeParse(projectIdInput);
  if (!parsedId.success) return { ok: false, error: "This project could not be identified." };

  try {
    const projectRef = adminDb().collection("projects").doc(parsedId.data);
    const projectSnap = await projectRef.get();
    if (!projectSnap.exists) return { ok: false, error: "This project no longer exists." };
    if (projectSnap.data()?.ownerUid !== user.uid) {
      return { ok: false, error: "You can only delete projects you own." };
    }

    await adminDb().recursiveDelete(projectRef);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    console.error("deleteProjectAction failed", error);
    return { ok: false, error: "We couldn't delete the project. Please try again." };
  }
}

export async function roastProjectAction(projectIdInput: unknown): Promise<RoastProjectResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in to roast this project." };

  const parsedId = ProjectIdSchema.safeParse(projectIdInput);
  if (!parsedId.success) return { ok: false, error: "This project could not be identified." };

  try {
    const projectRef = adminDb().collection("projects").doc(parsedId.data);
    const roastRef = repoRoastDocRef(parsedId.data);
    const projectSnap = await projectRef.get();
    if (!projectSnap.exists) return { ok: false, error: "This project no longer exists." };

    const projectData = projectSnap.data();
    if (projectData?.ownerUid !== user.uid) {
      return { ok: false, error: "You can only roast projects you own." };
    }

    const snapshotSnap = await projectRef.collection("snapshot").doc("main").get();
    if (!snapshotSnap.exists) {
      return { ok: false, error: "Wait for the repository snapshot before roasting it." };
    }

    const parsedProject = ProjectDocSchema.safeParse(projectData);
    const parsedSnapshot = SnapshotDocSchema.safeParse(snapshotSnap.data());
    if (!parsedProject.success || !parsedSnapshot.success) {
      return { ok: false, error: "This project's stored data is invalid. Reconnect the repository." };
    }

    const reservationToken = randomUUID();
    const reservedAt = Date.now();
    const reservation = await adminDb().runTransaction(async (transaction) => {
      const roastSnap = await transaction.get(roastRef);
      const decision = decideRepoRoastReservation(
        roastSnap.exists ? roastSnap.data() : undefined,
        reservedAt,
      );

      if (decision.kind === "complete") return decision;
      if (decision.kind !== "claim") return decision;

      transaction.set(roastRef, {
        status: "pending",
        reservationToken,
        reservedAt,
      });
      return decision;
    });

    if (reservation.kind === "complete") {
      return {
        ok: true,
        quote: reservation.roast.quote,
        file: reservation.roast.file,
      };
    }
    if (reservation.kind === "busy") {
      return { ok: false, error: "Geko is already roasting this project. Try again shortly." };
    }
    if (reservation.kind === "invalid") {
      return { ok: false, error: "This project's saved roast data is invalid." };
    }

    try {
      const result = await runRepoRoast({
        owner: parsedProject.data.owner,
        repo: parsedProject.data.repo,
        stack: parsedProject.data.stack,
        snapshot: parsedSnapshot.data,
      });
      const completedAt = Date.now();
      const completedRoast = {
        status: "complete" as const,
        quote: result.roast.quote,
        file: result.roast.file,
        generatedAt: completedAt,
        model: result.model,
        promptVersion: result.promptVersion,
      };

      await adminDb().runTransaction(async (transaction) => {
        const roastSnap = await transaction.get(roastRef);
        const current = RepoRoastRecordSchema.safeParse(roastSnap.data());
        if (
          !current.success ||
          current.data.status !== "pending" ||
          current.data.reservationToken !== reservationToken
        ) {
          throw new Error("Repo Roast reservation was lost before completion.");
        }
        transaction.set(roastRef, completedRoast);
      });

      return { ok: true, quote: completedRoast.quote, file: completedRoast.file };
    } catch (error) {
      await adminDb().runTransaction(async (transaction) => {
        const roastSnap = await transaction.get(roastRef);
        const current = RepoRoastRecordSchema.safeParse(roastSnap.data());
        if (
          current.success &&
          current.data.status === "pending" &&
          current.data.reservationToken === reservationToken
        ) {
          transaction.delete(roastRef);
        }
      });
      throw error;
    }
  } catch (error) {
    console.error("roastProjectAction failed", error);
    return { ok: false, error: "Geko couldn't finish the roast. Try again." };
  }
}

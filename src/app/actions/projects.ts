"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { MAX_PROJECTS, type ProjectDoc } from "@/lib/domain/project";
import { getCurrentUser } from "@/lib/auth/session";
import { adminDb } from "@/lib/firebase/admin";
import { normalizeRepoUrl, parseRepoUrl } from "@/lib/pipeline/ingest";

export type CreateProjectResult =
  | { ok: true; projectId: string }
  | { ok: false; error: string };

const RepoUrlInputSchema = z.string().trim().min(1).max(300);

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
      const owned = await tx.get(projects.where("ownerUid", "==", user.uid));
      if (owned.size >= MAX_PROJECTS) throw new ProjectLimitError();

      tx.set(projectRef, doc);
      tx.set(projectRef.collection("events").doc(), {
        type: "project_created",
        at: now,
        meta: { repoUrl: doc.repoUrl },
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

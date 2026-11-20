import "server-only";

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { fetchRepoHistory } from "@/lib/github";
import { getProject } from "@/lib/projects";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Sign in required" }, { status: 401 });
    }
    const project = await getProject(id, user.uid);
    if (!project) {
      return NextResponse.json({ ok: false, error: "Project not found" }, { status: 404 });
    }

    const commits = await fetchRepoHistory({ owner: project.owner, repo: project.repo }, 8);
    return NextResponse.json({ ok: true, commits });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load repository history.";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}

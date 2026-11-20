import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, FolderGit2 } from "lucide-react";
import { ProjectProgressCard } from "@/components/projects/project-progress-card";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { listDebugSessions } from "@/lib/debug";
import { OVERVIEW_SECTIONS } from "@/lib/domain/event";
import { countPassedLessons, emptyProgressDoc } from "@/lib/domain/progress";
import { getLessons, getProgress } from "@/lib/lessons";
import { listProjects } from "@/lib/projects";

export const metadata: Metadata = {
  title: "Your projects",
};

export default async function ProjectsPage() {
  const user = await requireUser("/projects");
  const projects = await listProjects(user.uid);
  const summaries = await Promise.all(
    projects.map(async (project) => {
      const [lessons, progress, debugSessions] = await Promise.all([
        getLessons(project.id),
        getProgress(project.id, user.uid),
        listDebugSessions(project.id),
      ]);
      const safeProgress = progress ?? emptyProgressDoc();

      return {
        project,
        passedLessons: countPassedLessons(safeProgress, lessons),
        lessonCount: lessons.length,
        overviewSections: OVERVIEW_SECTIONS.filter((section) =>
          safeProgress.overviewSections.includes(section),
        ).length,
        completedDebug: Object.values(safeProgress.debug).filter((entry) => entry.completed)
          .length,
        debugSessionCount: debugSessions.length,
      };
    }),
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-mono">Workspace</p>
          <h1 className="mt-2 text-3xl sm:text-4xl">Your projects</h1>
          <p className="mt-2 text-muted-foreground">
            Your repositories, pipeline status, and progress through each learning pathway.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard#connect-heading">
            Connect a project
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </header>

      {summaries.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-card/70 px-5 py-10 text-center sm:px-10">
          <FolderGit2 className="mx-auto size-8 text-primary" aria-hidden="true" />
          <h2 className="mt-4 text-xl font-semibold">No projects yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Connect a public repository to see its learning progress here.
          </p>
          <Button asChild className="mt-5">
            <Link href="/dashboard#connect-heading">
              Connect your first project
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </div>
      ) : (
        <>
          <p className="mt-8 font-mono text-xs text-muted-foreground">
            {summaries.length} {summaries.length === 1 ? "project" : "projects"} · newest activity first
          </p>
          <ul className="mt-4 grid grid-cols-1 items-stretch gap-4 md:grid-cols-2">
            {summaries.map((summary) => (
              <li key={summary.project.id}>
                <ProjectProgressCard {...summary} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

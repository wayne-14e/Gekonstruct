import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { after } from "next/server";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Bug,
  Check,
  ExternalLink,
  Layers,
  Map,
  ShieldCheck,
} from "lucide-react";
import { GekoAvatar } from "@/components/brand/geko-avatar";
import { XpBadge } from "@/components/app/xp-badge";
import { PathwayNav } from "@/components/projects/pathway-nav";
import { PipelineRunner } from "@/components/projects/pipeline-runner";
import { RepoRoast } from "@/components/projects/repo-roast";
import { StageBadge } from "@/components/projects/stage-badge";
import { Button } from "@/components/ui/button";
import { recordReturnVisit } from "@/lib/analytics";
import { getUserProfile } from "@/lib/auth/users";
import { requireUser } from "@/lib/auth/session";
import { getRepoRoast } from "@/lib/projects";
import { listDebugSessions } from "@/lib/debug";
import type { GuidebookDoc } from "@/lib/domain/architecture";
import type { DebugSessionDoc } from "@/lib/domain/debug";
import type { LessonDoc } from "@/lib/domain/lesson";
import type { ProjectStage, SnapshotDoc, Stack } from "@/lib/domain/project";
import { countPassedLessons, emptyProgressDoc, type ProgressDoc } from "@/lib/domain/progress";
import { getLessons, getProgress } from "@/lib/lessons";
import { stackChips } from "@/lib/pipeline/stack";
import { getGuidebook, getProject, getSnapshot } from "@/lib/projects";

export const metadata: Metadata = {
  title: "Project",
};

const STACK_LABELS: Array<[keyof Stack, string]> = [
  ["framework", "Framework"],
  ["language", "Language"],
  ["uiLib", "UI"],
  ["backend", "Backend"],
  ["db", "Data"],
  ["auth", "Auth"],
  ["hosting", "Hosting"],
];

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/projects/${id}`);
  const [project, profile] = await Promise.all([
    getProject(id, user.uid),
    getUserProfile(user.uid),
  ]);

  if (!project) notFound();

  after(() => recordReturnVisit(project.id).catch(() => undefined));

  const [snapshot, guidebook, lessons, progress, debugSessions, repoRoast] = await Promise.all([
    getSnapshot(project.id),
    getGuidebook(project.id),
    getLessons(project.id),
    getProgress(project.id, user.uid),
    listDebugSessions(project.id),
    getRepoRoast(project.id),
  ]);

  const safeProgress: ProgressDoc = progress ?? emptyProgressDoc();
  const passedCount = countPassedLessons(safeProgress, lessons);
  // A project that has moved past a stage but is missing that stage's output is broken
  // state, so send the runner back to the earliest missing step instead of showing an
  // empty chapter.
  const runnerNeeded = project.stage !== "ready" || guidebook === null || lessons.length === 0;
  const runnerStage: ProjectStage =
    runnerNeeded && project.stage === "ready"
      ? guidebook === null
        ? "ingested"
        : "architecture"
      : project.stage;

  const chips = project.stack ? stackChips(project.stack) : [];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
      <Link
        href="/projects"
        className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        All projects
      </Link>

      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="label-mono">Project</p>
          <h1 className="mt-2 truncate text-3xl sm:text-4xl">{project.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StageBadge stage={project.stage} />
            <a
              href={project.repoUrl}
              target="_blank"
              rel="noreferrer"
              className="path-chip hover:border-input"
            >
              {project.owner}/{project.repo}
              <ExternalLink className="ml-1.5 inline size-3" aria-hidden="true" />
            </a>
          </div>
        </div>
        <XpBadge totalXp={profile?.totalXp ?? 0} />
      </div>

      {chips.length > 0 ? (
        <ul className="mt-4 flex flex-wrap gap-1.5">
          {chips.map((chip) => (
            <li
              key={chip}
              className="rounded-md border border-border bg-[#0e141b] px-2 py-0.5 font-mono text-[0.6875rem] text-[#a9bccb]"
            >
              {chip}
            </li>
          ))}
        </ul>
      ) : null}

      <PathwayNav projectId={project.id} active={null} className="mt-6" />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.35fr_0.65fr] lg:items-start">
        <div>
          {runnerNeeded ? (
            <PipelineRunner
              projectId={project.id}
              stage={runnerStage}
              stageError={project.stageError}
              hasSnapshot={snapshot !== null}
              hasGuidebook={guidebook !== null}
              lessonCount={lessons.length}
            />
          ) : guidebook ? (
            <ReadyPanel
              projectId={project.id}
              guidebook={guidebook}
              snapshot={snapshot}
              lessons={lessons}
              passedCount={passedCount}
              debugSessions={debugSessions}
              progress={safeProgress}
            />
          ) : (
            <div className="rounded-2xl border border-[#584211] bg-[#2b1f06] p-5 text-sm leading-relaxed text-[#ffd57a]">
              This project has moved past the architecture map but the guidebook is
              missing. Reconnect the repository to rebuild it.
            </div>
          )}
        </div>

        <aside className="space-y-4">
          {project.stack ? (
            <section className="rounded-2xl border border-border bg-card p-5">
              <p className="label-mono">Detected stack</p>
              <dl className="mt-3 space-y-2 text-sm">
                {STACK_LABELS.map(([key, label]) => {
                  const value = project.stack?.[key];
                  if (!value) return null;
                  return (
                    <div key={key} className="flex items-baseline justify-between gap-3">
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd className="font-mono text-xs text-foreground">{value}</dd>
                    </div>
                  );
                })}
              </dl>
            </section>
          ) : null}

          <RepoRoast
            projectId={project.id}
            projectTitle={project.title}
            repoUrl={project.repoUrl}
            hasSnapshot={snapshot !== null}
            initialRoast={repoRoast}
          />

          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
              <p className="label-mono">Read-only</p>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Gekonstruct reads public files and stores a snapshot. It never writes to
              GitHub, opens pull requests, or asks for a token from you.
            </p>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-start gap-3">
              <GekoAvatar mood="calm" size="sm" />
              <p className="text-sm leading-relaxed text-muted-foreground">
                Start with the map if you feel lost. Start with lessons if you want to
                learn. Start with debug when something is broken.
              </p>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function ReadyPanel({
  projectId,
  guidebook,
  snapshot,
  lessons,
  passedCount,
  debugSessions,
  progress,
}: {
  projectId: string;
  guidebook: GuidebookDoc;
  snapshot: SnapshotDoc | null;
  lessons: LessonDoc[];
  passedCount: number;
  debugSessions: DebugSessionDoc[];
  progress: ProgressDoc;
}) {
  const layerCount = guidebook.architecture.layers.length;
  const conceptCount = guidebook.concepts.length;
  const stepCount = guidebook.architecture.dataFlow.length;
  const allPassed = lessons.length > 0 && passedCount === lessons.length;
  const completedDebugCount = Object.values(progress.debug).filter((d) => d.completed).length;
  const learnLabel =
    passedCount === 0 ? "Start the lessons" : allPassed ? "Review the lessons" : "Continue learning";

  return (
    <section
      aria-labelledby="ready-heading"
      className="rounded-2xl border border-border bg-card p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="label-mono">Guidebook</p>
          <h2 id="ready-heading" className="mt-2 text-xl">
            Your guidebook is ready
          </h2>
        </div>
        <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-[#1e5033] bg-[#0e2a1c] text-primary">
          <Layers className="size-[18px]" aria-hidden="true" />
        </span>
      </div>

      <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted-foreground">
        {guidebook.summary.whatItDoes}
      </p>

      <dl className="mt-5 grid grid-cols-3 gap-3">
        <Stat label="Layers" value={layerCount.toLocaleString()} />
        <Stat label="Lessons" value={`${passedCount}/${lessons.length}`} />
        <Stat label="Debug solved" value={completedDebugCount.toLocaleString()} />
      </dl>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex flex-col rounded-xl border border-border bg-[#0e141b] p-4">
          <div className="flex items-center gap-2">
            <Map className="size-4 text-primary" aria-hidden="true" />
            <p className="text-sm font-semibold text-foreground">Architecture map</p>
          </div>
          <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted-foreground">
            {layerCount} layers, {stepCount} flow steps and {conceptCount} concepts from your
            real files.
          </p>
          <Button asChild variant="outline" size="sm" className="mt-3 w-fit">
            <Link href={`/projects/${projectId}/overview`}>
              Open map
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </div>

        <div className="flex flex-col rounded-xl border border-[#1e5033] bg-[#0e2a1c] p-4">
          <div className="flex items-center gap-2">
            <BookOpen className="size-4 text-primary" aria-hidden="true" />
            <p className="text-sm font-semibold text-foreground">Foundations</p>
          </div>
          <p className="mt-1.5 flex-1 text-sm leading-relaxed text-[#a9cbb8]">
            {lessons.length} ordered lessons with quizzes and real code.{" "}
            {allPassed
              ? "All passed."
              : `${passedCount}/${lessons.length} passed.`}
          </p>
          <Button asChild size="sm" className="mt-3 w-fit">
            <Link href={`/projects/${projectId}/learn`}>
              {learnLabel}
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </div>

        <div className="flex flex-col rounded-xl border border-border bg-[#0e141b] p-4">
          <div className="flex items-center gap-2">
            <Bug className="size-4 text-primary" aria-hidden="true" />
            <p className="text-sm font-semibold text-foreground">Debug & Learn</p>
          </div>
          <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted-foreground">
            {debugSessions.length > 0
              ? `${debugSessions.length} session(s) run. Find evidence files in your code, get fix directions and +30 XP.`
              : "Symptom-led debugging. Find evidence files in your code, get fix directions and +30 XP."}
          </p>
          <Button asChild variant="outline" size="sm" className="mt-3 w-fit">
            <Link href={`/projects/${projectId}/debug`}>
              Open debug
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>

      {allPassed ? (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-[#584211] bg-[#2b1f06] p-4">
          <Check className="mt-0.5 size-4 shrink-0 text-[#ffc53d]" aria-hidden="true" />
          <p className="text-sm leading-relaxed text-[#ffd57a]">
            Foundations complete. Next time you get stuck, the debug pathway explains the
            error in the context of these same files.
          </p>
        </div>
      ) : null}

      {snapshot ? (
        <details className="mt-5 rounded-xl border border-border bg-[#0e141b]">
          <summary className="cursor-pointer rounded-xl px-4 py-3 text-sm font-medium text-foreground outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring">
            Files in this snapshot
          </summary>
          <ul className="max-h-72 space-y-1 overflow-y-auto border-t border-border/70 px-4 py-3 font-mono text-xs">
            {snapshot.files.map((file) => (
              <li key={file.path} className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate text-[#a9bccb]">{file.path}</span>
                <span className="shrink-0 text-muted-foreground tabular-nums">
                  {formatBytes(file.size)}
                </span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-[#0e141b] p-3">
      <dt className="label-mono">{label}</dt>
      <dd className="mt-1 font-mono text-lg font-semibold text-foreground tabular-nums">
        {value}
      </dd>
    </div>
  );
}

function formatBytes(value: number): string {
  if (value < 1_024) return `${value} B`;
  return `${(value / 1_024).toFixed(1)} KB`;
}

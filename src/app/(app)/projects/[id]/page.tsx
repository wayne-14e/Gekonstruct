import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, FileCode2, ShieldCheck } from "lucide-react";
import { GekoAvatar } from "@/components/brand/geko-avatar";
import { XpBadge } from "@/components/app/xp-badge";
import { PipelineRunner } from "@/components/projects/pipeline-runner";
import { StageBadge } from "@/components/projects/stage-badge";
import { getUserProfile } from "@/lib/auth/users";
import { requireUser } from "@/lib/auth/session";
import { isFailedStage, type SnapshotDoc, type Stack } from "@/lib/domain/project";
import { stackChips } from "@/lib/pipeline/stack";
import { getProject, getSnapshot } from "@/lib/projects";

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

  const snapshot = await getSnapshot(project.id);
  const needsIngest =
    project.stage === "created" ||
    isFailedStage(project.stage) ||
    (project.stage === "ingested" && snapshot === null);
  const chips = project.stack ? stackChips(project.stack) : [];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
      <Link
        href="/dashboard"
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

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1.35fr_0.65fr] lg:items-start">
        <div>
          {needsIngest ? (
            <PipelineRunner
              projectId={project.id}
              stage={project.stage}
              stageError={project.stageError}
            />
          ) : snapshot ? (
            <SnapshotPanel snapshot={snapshot} />
          ) : (
            <div className="rounded-2xl border border-[#584211] bg-[#2b1f06] p-5 text-sm text-[#ffd57a]">
              This project has moved past ingestion but its snapshot is missing. Reconnect
              the repository to rebuild it.
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

function SnapshotPanel({ snapshot }: { snapshot: SnapshotDoc }) {
  return (
    <section
      aria-labelledby="snapshot-heading"
      className="rounded-2xl border border-border bg-card p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="label-mono">Snapshot</p>
          <h2 id="snapshot-heading" className="mt-2 text-xl">
            Repository captured
          </h2>
        </div>
        <span className="font-mono text-[0.6875rem] tracking-[0.08em] text-muted-foreground uppercase">
          {formatDate(snapshot.fetchedAt)}
        </span>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Files kept" value={snapshot.files.length.toLocaleString()} />
        <Stat label="Characters" value={formatChars(snapshot.totalChars)} />
        <Stat label="Files trimmed" value={snapshot.truncated.length.toLocaleString()} />
      </dl>

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

      <div className="mt-5 rounded-xl border border-[#584211] bg-[#2b1f06] p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-[#ffd57a]">
          <FileCode2 className="size-4" aria-hidden="true" />
          Next build step
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-[#e8c77a]">
          The architecture map arrives in Phase 3. This snapshot and stack are stored, so
          the analysis will not need to re-read GitHub.
        </p>
      </div>
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

function formatChars(value: number): string {
  if (value < 1_000) return String(value);
  return `${(value / 1_000).toFixed(1)}k`;
}

function formatBytes(value: number): string {
  if (value < 1_024) return `${value} B`;
  return `${(value / 1_024).toFixed(1)} KB`;
}

function formatDate(ms: number): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(ms));
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ExternalLink, FileCode2, Map, ShieldCheck } from "lucide-react";
import { GekoAvatar } from "@/components/brand/geko-avatar";
import { XpBadge } from "@/components/app/xp-badge";
import { PipelineRunner } from "@/components/projects/pipeline-runner";
import { StageBadge } from "@/components/projects/stage-badge";
import { Button } from "@/components/ui/button";
import { getUserProfile } from "@/lib/auth/users";
import { requireUser } from "@/lib/auth/session";
import type { GuidebookDoc } from "@/lib/domain/architecture";
import type { ProjectStage, SnapshotDoc, Stack } from "@/lib/domain/project";
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

const MAPPED_STAGES = new Set<ProjectStage>(["architecture", "lessons1", "lessons2", "ready"]);

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/projects/${id}`);
  const [project, profile] = await Promise.all([
    getProject(id, user.uid),
    getUserProfile(user.uid),
  ]);

  if (!project) notFound();

  const [snapshot, guidebook] = await Promise.all([
    getSnapshot(project.id),
    getGuidebook(project.id),
  ]);

  const mapped = MAPPED_STAGES.has(project.stage);
  // A project that says it is mapped but has no guidebook is broken state, so send the
  // runner back to the architecture step rather than showing an empty chapter.
  const runnerNeeded = !mapped || (project.stage === "architecture" && guidebook === null);
  const runnerStage: ProjectStage =
    runnerNeeded && mapped ? "ingested" : project.stage;

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
          {runnerNeeded ? (
            <PipelineRunner
              projectId={project.id}
              stage={runnerStage}
              stageError={project.stageError}
              hasSnapshot={snapshot !== null}
            />
          ) : guidebook ? (
            <MapReadyPanel projectId={project.id} guidebook={guidebook} snapshot={snapshot} />
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

function MapReadyPanel({
  projectId,
  guidebook,
  snapshot,
}: {
  projectId: string;
  guidebook: GuidebookDoc;
  snapshot: SnapshotDoc | null;
}) {
  const layerCount = guidebook.architecture.layers.length;
  const conceptCount = guidebook.concepts.length;
  const stepCount = guidebook.architecture.dataFlow.length;

  return (
    <section
      aria-labelledby="map-heading"
      className="rounded-2xl border border-border bg-card p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="label-mono">Architecture</p>
          <h2 id="map-heading" className="mt-2 text-xl">
            Your map is ready
          </h2>
        </div>
        <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-[#1e5033] bg-[#0e2a1c] text-primary">
          <Map className="size-[18px]" aria-hidden="true" />
        </span>
      </div>

      <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted-foreground">
        {guidebook.summary.whatItDoes}
      </p>

      <dl className="mt-5 grid grid-cols-3 gap-3">
        <Stat label="Layers" value={layerCount.toLocaleString()} />
        <Stat label="Flow steps" value={stepCount.toLocaleString()} />
        <Stat label="Concepts" value={conceptCount.toLocaleString()} />
      </dl>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button asChild size="lg">
          <Link href={`/projects/${projectId}/overview`}>
            Open the architecture map
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
        {snapshot ? (
          <p className="font-mono text-[0.6875rem] tracking-[0.08em] text-muted-foreground uppercase">
            {snapshot.files.length} files · {formatChars(snapshot.totalChars)} chars
          </p>
        ) : null}
      </div>

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

      <div className="mt-5 rounded-xl border border-border bg-[#0e141b] p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <FileCode2 className="size-4 text-primary" aria-hidden="true" />
          Next build step
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          The Foundations lessons arrive in Phase 4. They reuse this map and the same
          snapshot, so nothing needs to be re-read from GitHub.
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

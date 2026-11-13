import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, FolderGit2, ShieldCheck, Sparkles } from "lucide-react";
import { GekoAvatar } from "@/components/brand/geko-avatar";
import { XpBadge } from "@/components/app/xp-badge";
import { ConnectRepoForm } from "@/components/projects/connect-repo-form";
import { StageBadge } from "@/components/projects/stage-badge";
import { Button } from "@/components/ui/button";
import { getUserProfile } from "@/lib/auth/users";
import { requireUser } from "@/lib/auth/session";
import { MAX_PROJECTS } from "@/lib/domain/project";
import { stackChips } from "@/lib/pipeline/stack";
import { listProjects, type ProjectRecord } from "@/lib/projects";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const user = await requireUser("/dashboard");
  const [profile, projects] = await Promise.all([
    getUserProfile(user.uid),
    listProjects(user.uid),
  ]);

  const totalXp = profile?.totalXp ?? 0;
  const atLimit = projects.length >= MAX_PROJECTS;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="label-mono">Workspace</p>
          <h1 className="mt-2 text-3xl sm:text-4xl">Your projects</h1>
          <p className="mt-2 max-w-xl text-muted-foreground">
            {projects.length === 0
              ? `No repositories connected yet. You can connect up to ${MAX_PROJECTS} while we validate.`
              : `${projects.length} of ${MAX_PROJECTS} repositories connected. Open one to run its pipeline.`}
          </p>
        </div>
        <XpBadge totalXp={totalXp} />
      </div>

      <section
        aria-labelledby="connect-heading"
        className="mt-8 rounded-2xl border border-border bg-card p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="label-mono">Connect</p>
            <h2 id="connect-heading" className="mt-2 text-xl">
              Read a public repository
            </h2>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Paste the repo root URL. Geko reads the tree once, keeps a snapshot of the
              files that matter, and never writes back.
            </p>
          </div>
          <span className="rounded-md border border-border bg-secondary px-2 py-1 font-mono text-[0.6875rem] tracking-[0.08em] text-muted-foreground tabular-nums uppercase">
            {projects.length} / {MAX_PROJECTS} connected
          </span>
        </div>

        <div className="mt-4">
          <ConnectRepoForm atLimit={atLimit} remaining={Math.max(0, MAX_PROJECTS - projects.length)} />
        </div>
      </section>

      <section aria-labelledby="projects-heading" className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="projects-heading" className="text-xl">
            Your projects
          </h2>
          {projects.length > 0 ? (
            <p className="font-mono text-[0.6875rem] tracking-[0.1em] text-muted-foreground uppercase">
              newest activity first
            </p>
          ) : null}
        </div>

        {projects.length === 0 ? (
          <EmptyProjects />
        ) : (
          <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <li key={project.id}>
                <ProjectCard project={project} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function ProjectCard({ project }: { project: ProjectRecord }) {
  const chips = project.stack ? stackChips(project.stack) : [];
  const failed = project.stage.startsWith("failed:");

  return (
    <article className="flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#3a4b61]">
      <div className="flex items-start justify-between gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-[#1e5033] bg-[#0e2a1c] text-primary">
          <FolderGit2 className="size-[18px]" aria-hidden="true" />
        </span>
        <StageBadge stage={project.stage} />
      </div>

      <h3 className="mt-3 truncate text-lg tracking-[-0.02em]">{project.title}</h3>
      <p className="path-chip mt-1 w-fit max-w-full">
        {project.owner}/{project.repo}
      </p>

      {failed && project.stageError ? (
        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-destructive">
          {project.stageError}
        </p>
      ) : chips.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {chips.slice(0, 5).map((chip) => (
            <li
              key={chip}
              className="rounded-md border border-border bg-[#0e141b] px-2 py-0.5 font-mono text-[0.6875rem] text-[#a9bccb]"
            >
              {chip}
            </li>
          ))}
          {chips.length > 5 ? (
            <li className="rounded-md border border-border bg-secondary px-2 py-0.5 font-mono text-[0.6875rem] text-muted-foreground">
              +{chips.length - 5}
            </li>
          ) : null}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          Waiting to be read. Open it to run ingestion.
        </p>
      )}

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-border/70 pt-4">
        <span className="font-mono text-[0.6875rem] text-muted-foreground">
          {formatDate(project.updatedAt)}
        </span>
        <Button asChild size="sm" variant="outline">
          <Link href={`/projects/${project.id}`}>
            Open
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </article>
  );
}

function EmptyProjects() {
  const tiles = [
    {
      icon: FolderGit2,
      title: "Public repo",
      body: "Paste a github.com URL. Private repos are out of scope in the MVP.",
    },
    {
      icon: Sparkles,
      title: "About a minute",
      body: "Ingestion is fast; the analysis runs as visible pipeline steps.",
    },
    {
      icon: ShieldCheck,
      title: "Read-only",
      body: "Gekonstruct never writes, pushes, or opens pull requests.",
    },
  ];

  return (
    <div className="mt-4 rounded-2xl border border-dashed border-border bg-card/70 px-5 py-10 text-center sm:px-10 sm:py-12">
      <div className="mx-auto flex max-w-md flex-col items-center">
        <GekoAvatar mood="encouraging" size="lg" />
        <h3 className="mt-4 text-xl">Your first repo goes here</h3>
        <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted-foreground">
          Connect a public GitHub project and Geko maps it, teaches it, and keeps your XP
          in one place. Projects that have grown past a single file benefit most.
        </p>
      </div>

      <ul className="mx-auto mt-8 grid max-w-2xl grid-cols-1 gap-3 text-left sm:grid-cols-3">
        {tiles.map((tile) => (
          <li key={tile.title} className="rounded-xl border border-border bg-card p-3.5">
            <tile.icon className="size-4 text-primary" aria-hidden="true" />
            <p className="mt-2 text-sm font-medium">{tile.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{tile.body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatDate(ms: number): string {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(ms));
}

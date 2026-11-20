import Link from "next/link";
import { ArrowRight, Bug, FolderGit2, GraduationCap, Map } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StageBadge } from "@/components/projects/stage-badge";
import { DeleteProjectButton } from "@/components/projects/delete-project-button";
import type { ProjectRecord } from "@/lib/projects";
import { stackChips } from "@/lib/pipeline/stack";

const OVERVIEW_SECTIONS = ["summary", "layers", "flow", "concepts"] as const;

export type ProjectProgressSummary = {
  project: ProjectRecord;
  passedLessons: number;
  lessonCount: number;
  overviewSections: number;
  completedDebug: number;
  debugSessionCount: number;
};

export function ProjectProgressCard({
  project,
  passedLessons,
  lessonCount,
  overviewSections,
  completedDebug,
  debugSessionCount,
}: ProjectProgressSummary) {
  const chips = project.stack ? stackChips(project.stack) : [];
  const failed = project.stage.startsWith("failed:");
  const debugTotal = Math.max(completedDebug, debugSessionCount);

  return (
    <article className="flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#3a4b61] sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-[#1e5033] bg-[#0e2a1c] text-primary">
          <FolderGit2 className="size-[18px]" aria-hidden="true" />
        </span>
        <div className="flex items-center gap-2">
          <StageBadge stage={project.stage} />
        </div>
      </div>

      <h2 className="mt-3 truncate text-lg font-semibold tracking-[-0.02em]">{project.title}</h2>
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

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <PathwayProgress
          icon={Map}
          label="Architecture map"
          value={overviewSections}
          max={OVERVIEW_SECTIONS.length}
          suffix="sections read"
        />
        <PathwayProgress
          icon={GraduationCap}
          label="Foundations"
          value={passedLessons}
          max={lessonCount}
          suffix="lessons passed"
          emptyLabel={project.stage === "ready" ? "No lessons available" : "Lessons not ready"}
        />
        <PathwayProgress
          icon={Bug}
          label="Debug & Learn"
          value={completedDebug}
          max={debugTotal}
          suffix="sessions completed"
          emptyLabel="No sessions yet"
        />
      </div>

      <div className="mt-4 border-t border-border/70 pt-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <DeleteProjectButton projectId={project.id} projectTitle={project.title} />
            <span className="truncate font-mono text-[0.6875rem] text-muted-foreground">
              Updated {formatDate(project.updatedAt)}
            </span>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link href={`/projects/${project.id}`}>
              Open
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

function PathwayProgress({
  icon: Icon,
  label,
  value,
  max,
  suffix,
  emptyLabel,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  max: number;
  suffix: string;
  emptyLabel?: string;
}) {
  const percent = max > 0 ? Math.round((value / max) * 100) : 0;

  return (
    <div className="rounded-xl border border-border bg-[#0e141b] p-3">
      <div className="flex items-center gap-2 text-xs font-medium">
        <Icon className="size-4 text-primary" aria-hidden="true" />
        {label}
      </div>
      {max === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">{emptyLabel ?? "Nothing to track yet"}</p>
      ) : (
        <>
          <div className="mt-3 flex items-baseline justify-between gap-2">
            <p className="text-xs font-semibold tabular-nums">
              {value} / {max} <span className="font-normal text-muted-foreground">{suffix}</span>
            </p>
            <span className="font-mono text-[0.6875rem] text-muted-foreground">{percent}%</span>
          </div>
          <div
            className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary"
            role="progressbar"
            aria-label={`${label}: ${value} of ${max} ${suffix}`}
            aria-valuemin={0}
            aria-valuemax={max}
            aria-valuenow={Math.min(value, max)}
          >
            <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
          </div>
        </>
      )}
    </div>
  );
}

function formatDate(ms: number): string {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(ms));
}

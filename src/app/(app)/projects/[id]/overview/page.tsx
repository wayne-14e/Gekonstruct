import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Lightbulb,
  Sparkles,
} from "lucide-react";
import { GekoAvatar } from "@/components/brand/geko-avatar";
import { SpeechBubble } from "@/components/brand/speech-bubble";
import { XpBadge } from "@/components/app/xp-badge";
import { FileChipList, InlineText } from "@/components/projects/guidebook-parts";
import { OverviewTracker } from "@/components/projects/overview-tracker";
import { ArchitectureExplorer } from "@/components/projects/architecture-explorer";
import { OverviewPager } from "@/components/projects/overview-pager";
import { PathwayNav } from "@/components/projects/pathway-nav";
import { RequestFlow } from "@/components/projects/request-flow";
import { StageBadge } from "@/components/projects/stage-badge";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { getUserProfile } from "@/lib/auth/users";
import { emptyProgressDoc } from "@/lib/domain/progress";
import { getProgress } from "@/lib/lessons";
import { getGuidebook, getProject, type ProjectRecord } from "@/lib/projects";

export const metadata: Metadata = {
  title: "Architecture map",
};

export default async function OverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/projects/${id}/overview`);
  const [project, profile] = await Promise.all([
    getProject(id, user.uid),
    getUserProfile(user.uid),
  ]);

  if (!project) notFound();

  const [guidebook, progress] = await Promise.all([
    getGuidebook(project.id),
    getProgress(project.id, user.uid),
  ]);
  if (!guidebook) return <MapMissing project={project} />;

  const safeProgress = progress ?? emptyProgressDoc();
  const badgeEarned = safeProgress.badges.includes("map-reader");
  const { summary, architecture, concepts } = guidebook;
  const lessonsReady =
    project.stage === "lessons1" || project.stage === "lessons2" || project.stage === "ready";

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
      <Link
        href={`/projects/${project.id}`}
        className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {project.title}
      </Link>

      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="label-mono">Pathway 3 · Architecture</p>
          <h1 className="mt-2 text-3xl sm:text-4xl">The map of {project.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StageBadge stage={project.stage} />
            <span className="path-chip">
              {project.owner}/{project.repo}
            </span>
            <span className="font-mono text-[0.6875rem] text-muted-foreground">
              mapped {formatDate(guidebook.analyzedAt)}
            </span>
          </div>
        </div>
        <XpBadge totalXp={profile?.totalXp ?? 0} />
      </div>

      <PathwayNav projectId={project.id} active="map" className="mt-6" />

      <OverviewTracker
        projectId={project.id}
        initialViewed={safeProgress.overviewSections}
        initialBadgeEarned={badgeEarned}
      />

      <SpeechBubble mood="encouraging" className="mt-6" label="Geko">
        <InlineText text={summary.gekoIntro} />
      </SpeechBubble>

      <OverviewPager
        labels={["What", "Skill map", "Request", "Concepts"]}
      >
      <section
        aria-labelledby="summary-heading"
        data-overview-section="summary"
        className="mt-8"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" aria-hidden="true" />
          <h2 id="summary-heading" className="text-xl">
            What this project is
          </h2>
        </div>
        <p className="mt-3 text-lg leading-relaxed text-foreground">
          <InlineText text={summary.whatItDoes} />
        </p>
        <div className="mt-4 rounded-2xl border border-border bg-card p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <p className="label-mono">In plain words</p>
          <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted-foreground">
            <InlineText text={summary.plainSummary} />
          </p>
        </div>
      </section>

      <ArchitectureExplorer guidebook={guidebook} repoUrl={project.repoUrl} />

      <RequestFlow
        projectId={project.id}
        steps={architecture.dataFlow}
        initialUnderstoodSteps={safeProgress.understoodRequestSteps}
      />

      <section
        aria-labelledby="concepts-heading"
        data-overview-section="concepts"
        className="mt-10"
      >
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div className="flex items-center gap-2">
            <Lightbulb className="size-4 text-primary" aria-hidden="true" />
            <h2 id="concepts-heading" className="text-xl">
              Concepts this codebase uses
            </h2>
          </div>
          <p className="font-mono text-[0.6875rem] tracking-[0.1em] text-muted-foreground uppercase">
            {concepts.length} terms
          </p>
        </div>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          These are the words the code assumes you already know. Each one is explained
          using your own files, not a textbook.
        </p>

        <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {concepts.map((concept) => (
            <li
              key={concept.id}
              className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
            >
              <p className="label-mono">Concept</p>
              <h3 className="mt-1.5 text-lg tracking-[-0.02em]">{concept.term}</h3>
              <p className="mt-2 text-sm leading-relaxed text-card-foreground">
                <InlineText text={concept.plainDefinition} />
              </p>
              <div className="mt-3 rounded-xl border-l-2 border-primary/70 bg-[#0e141b] px-3 py-2.5">
                <p className="font-mono text-[0.625rem] tracking-[0.12em] text-muted-foreground uppercase">
                  Why it matters here
                </p>
                <p className="mt-1 text-sm leading-relaxed text-[#a9bccb]">
                  <InlineText text={concept.whyItMatters} />
                </p>
              </div>
              <FileChipList files={concept.files} repoUrl={project.repoUrl} className="mt-3" />
            </li>
          ))}
        </ul>
      </section>
      </OverviewPager>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        <div className="flex items-start gap-3">
          <GekoAvatar mood="proud" size="sm" />
          <div>
            <p className="text-sm font-semibold text-foreground">
              You can now name the big pieces of your own project.
            </p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {lessonsReady
                ? "The Foundations lessons walk these same files one at a time, with quizzes."
                : "The Foundations lessons will walk these same files one at a time."}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {lessonsReady ? (
            <Button asChild size="sm">
              <Link href={`/projects/${project.id}/learn`}>
                Start the lessons
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          ) : null}
          <Button asChild variant="outline" size="sm">
            <Link href={`/projects/${project.id}`}>
              Back to project
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function MapMissing({ project }: { project: ProjectRecord }) {
  const failed = project.stage === "failed:architecture";
  const reason = failed
    ? project.stageError ?? "The architecture map failed to build."
    : "This project doesn't have an architecture map yet.";

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-card p-6 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-10">
        <div className="mx-auto w-fit">
          <GekoAvatar mood="calm" size="lg" />
        </div>
        <h1 className="mt-4 text-2xl">
          {failed ? "The map didn't make it" : "No map yet"}
        </h1>
        <p
          className={
            failed
              ? "mx-auto mt-3 max-w-md text-sm leading-relaxed text-destructive"
              : "mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground"
          }
        >
          {reason}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link href={`/projects/${project.id}`}>
              <ArrowLeft aria-hidden="true" />
              {failed ? "Retry the map" : "Back to project"}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/projects">All projects</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function formatDate(ms: number): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(ms));
}

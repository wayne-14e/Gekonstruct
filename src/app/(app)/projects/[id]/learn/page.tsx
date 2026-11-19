import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CircleHelp,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { GekoAvatar } from "@/components/brand/geko-avatar";
import { SpeechBubble } from "@/components/brand/speech-bubble";
import { XpBadge } from "@/components/app/xp-badge";
import { StageBadge } from "@/components/projects/stage-badge";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { getUserProfile } from "@/lib/auth/users";
import { LESSON_LIMITS, type LessonDoc } from "@/lib/domain/lesson";
import { countPassedLessons, emptyProgressDoc } from "@/lib/domain/progress";
import { getLessons, getProgress } from "@/lib/lessons";
import { getGuidebook, getProject } from "@/lib/projects";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Foundations",
};

export default async function LearnPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/projects/${id}/learn`);
  const project = await getProject(id, user.uid);
  if (!project) notFound();

  const [lessons, progress, profile, guidebook] = await Promise.all([
    getLessons(project.id),
    getProgress(project.id, user.uid),
    getUserProfile(user.uid),
    getGuidebook(project.id),
  ]);

  const safeProgress = progress ?? emptyProgressDoc();
  const passedCount = countPassedLessons(safeProgress, lessons);
  const allPassed = lessons.length > 0 && passedCount === lessons.length;
  const nextLesson = lessons.find((lesson) => safeProgress.lessons[lesson.id]?.passed !== true);
  const percent = lessons.length > 0 ? Math.round((passedCount / lessons.length) * 100) : 0;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-12">
      <Link
        href={`/projects/${project.id}`}
        className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {project.title}
      </Link>

      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="label-mono">Pathway 1 · Foundations</p>
          <h1 className="mt-2 text-3xl sm:text-4xl">Learn {project.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StageBadge stage={project.stage} />
            <span className="path-chip">
              {project.owner}/{project.repo}
            </span>
            {lessons.length > 0 ? (
              <span className="font-mono text-[0.6875rem] text-muted-foreground">
                {lessons.length} lessons · ordered
              </span>
            ) : null}
          </div>
        </div>
        <XpBadge totalXp={profile?.totalXp ?? 0} />
      </div>

      {lessons.length === 0 ? (
        <LessonsMissing projectId={project.id} stage={project.stage} stageError={project.stageError} />
      ) : (
        <>
          <SpeechBubble mood="encouraging" className="mt-6" label="Geko">
            {guidebook?.summary.gekoIntro ??
              "These lessons are built from your own files. Read one, answer its quiz, and you will be able to explain that part of your project in your own words."}
          </SpeechBubble>

          <section
            aria-labelledby="progress-heading"
            className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-6"
          >
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="label-mono">Your progress</p>
                <h2 id="progress-heading" className="mt-2 text-xl">
                  {passedCount} of {lessons.length} lessons passed
                </h2>
              </div>
              <span className="font-mono text-2xl font-semibold text-foreground tabular-nums">
                {percent}%
              </span>
            </div>

            <div
              className="mt-4 h-2 w-full overflow-hidden rounded-full bg-secondary"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={lessons.length}
              aria-valuenow={passedCount}
              aria-label={`${passedCount} of ${lessons.length} lessons passed`}
            >
              <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${percent}%` }} />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-[#ffc53d]" aria-hidden="true" />
                {safeProgress.xp} XP earned in this pathway
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CircleHelp className="size-3.5" aria-hidden="true" />
                {LESSON_LIMITS.xp} XP per first pass · +{LESSON_LIMITS.pathwayBonus} for all lessons
              </span>
            </div>

            {nextLesson ? (
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Button asChild size="lg">
                  <Link href={`/projects/${project.id}/learn/${nextLesson.id}`}>
                    {passedCount === 0 ? "Start lesson 1" : "Continue learning"}
                    <ArrowRight aria-hidden="true" />
                  </Link>
                </Button>
                <p className="text-xs text-muted-foreground">
                  Next: {nextLesson.title}
                </p>
              </div>
            ) : null}
          </section>

          {allPassed ? (
            <section className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#584211] bg-[#2b1f06] p-5">
              <div className="flex items-start gap-3">
                <GekoAvatar mood="proud" size="sm" />
                <div>
                  <p className="text-sm font-semibold text-[#ffd57a]">
                    Foundations complete. You passed every lesson.
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-[#e3c98d]">
                    {safeProgress.pathwayBonusAwarded
                      ? `The +${LESSON_LIMITS.pathwayBonus} pathway bonus is in your XP.`
                      : `Your final pass unlocks the +${LESSON_LIMITS.pathwayBonus} pathway bonus.`}
                  </p>
                </div>
              </div>
              <Button asChild variant="outline">
                <Link href={`/projects/${project.id}/overview`}>
                  Review the map
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            </section>
          ) : null}

          <LessonPart
            title="Part 1 · The foundation"
            description="What this project is, how a request or render flows, and where the data lives."
            lessons={lessons.filter((lesson) => lesson.part === 1)}
            projectId={project.id}
            progress={safeProgress}
          />
          <LessonPart
            title="Part 2 · Change it safely"
            description="Auth and permissions, adding a feature without breaking neighbours, and how to debug here."
            lessons={lessons.filter((lesson) => lesson.part === 2)}
            projectId={project.id}
            progress={safeProgress}
          />

          <div className="mt-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-5">
            <p className="text-sm leading-relaxed text-muted-foreground">
              The map is the quick orientation. These lessons are the deep pass through the
              same files.
            </p>
            <Button asChild variant="outline" size="sm">
              <Link href={`/projects/${project.id}/overview`}>
                Open the architecture map
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function LessonPart({
  title,
  description,
  lessons,
  projectId,
  progress,
}: {
  title: string;
  description: string;
  lessons: LessonDoc[];
  projectId: string;
  progress: ReturnType<typeof emptyProgressDoc>;
}) {
  if (lessons.length === 0) {
    return (
      <section className="mt-10">
        <h2 className="text-xl">{title}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>
        <div className="mt-4 rounded-xl border border-dashed border-border bg-card/70 p-5 text-sm text-muted-foreground">
          This half is still being written. Open the project and finish the lessons step in
          the pipeline.
        </div>
      </section>
    );
  }

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-xl">{title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
        <p className="font-mono text-[0.6875rem] tracking-[0.1em] text-muted-foreground uppercase">
          {lessons.length} lessons
        </p>
      </div>

      <ol className="mt-4 space-y-3">
        {lessons.map((lesson) => {
          const passed = progress.lessons[lesson.id]?.passed === true;
          return (
            <li key={lesson.id}>
              <Link
                href={`/projects/${projectId}/learn/${lesson.id}`}
                className={cn(
                  "group flex items-start gap-4 rounded-2xl border bg-card p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-colors sm:p-5",
                  passed
                    ? "border-[#1e5033] hover:border-[#2a6a45]"
                    : "border-border hover:border-[#3a4b61]",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg border font-mono text-xs font-semibold tabular-nums",
                    passed
                      ? "border-[#1e5033] bg-[#0e2a1c] text-primary"
                      : "border-border bg-[#0e141b] text-muted-foreground",
                  )}
                >
                  {passed ? <Check className="size-4" aria-label="Passed" /> : String(lesson.order).padStart(2, "0")}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-semibold tracking-[-0.01em] text-foreground">
                      {lesson.title}
                    </span>
                    {passed ? (
                      <span className="inline-flex h-5 items-center rounded border border-[#1e5033] bg-[#0e2a1c] px-1.5 font-mono text-[0.625rem] tracking-[0.06em] text-[#8ce85f] uppercase">
                        Passed
                      </span>
                    ) : (
                      <span className="inline-flex h-5 items-center rounded border border-[#584211] bg-[#2b1f06] px-1.5 font-mono text-[0.625rem] tracking-[0.06em] text-[#ffc53d] uppercase">
                        +{lesson.xp} XP
                      </span>
                    )}
                  </span>
                  <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">
                    {lesson.goal}
                  </span>
                </span>
                <ArrowRight
                  className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
                  aria-hidden="true"
                />
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function LessonsMissing({
  projectId,
  stage,
  stageError,
}: {
  projectId: string;
  stage: string;
  stageError: string | null;
}) {
  const failed = stage === "failed:lessons1" || stage === "failed:lessons2";

  return (
    <div className="mt-8 rounded-2xl border border-border bg-card p-6 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-10">
      <div className="mx-auto w-fit">
        <GekoAvatar mood={failed ? "calm" : "encouraging"} size="lg" />
      </div>
      <h2 className="mt-4 text-2xl">{failed ? "The lessons didn't make it" : "No lessons yet"}</h2>
      <p
        className={cn(
          "mx-auto mt-3 max-w-md text-sm leading-relaxed",
          failed ? "text-destructive" : "text-muted-foreground",
        )}
      >
        {failed
          ? stageError ?? "The lesson stage failed. Open the project and retry it."
          : stage === "ready"
            ? "This project is marked ready but no lessons were stored. Open the project and rebuild the lesson stage."
            : "The Foundations lessons are written after the architecture map. Open the project and run the pipeline."}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link href={`/projects/${projectId}`}>
            <RotateCcw aria-hidden="true" />
            {failed ? "Retry the lessons" : "Open the project"}
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard">
            <BookOpen aria-hidden="true" />
            All projects
          </Link>
        </Button>
      </div>
    </div>
  );
}

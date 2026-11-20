import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { after } from "next/server";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleCheck,
  Code2,
  FileCode2,
} from "lucide-react";
import { SpeechBubble } from "@/components/brand/speech-bubble";
import { XpBadge } from "@/components/app/xp-badge";
import { CodeBlock } from "@/components/projects/code-block";
import { FileChip } from "@/components/projects/guidebook-parts";
import { LessonMarkdown } from "@/components/projects/lesson-markdown";
import { PathwayNav } from "@/components/projects/pathway-nav";
import { Quiz } from "@/components/projects/quiz";
import { StageBadge } from "@/components/projects/stage-badge";
import { Button } from "@/components/ui/button";
import { recordLessonViewed } from "@/lib/analytics";
import { requireUser } from "@/lib/auth/session";
import { getUserProfile } from "@/lib/auth/users";
import { emptyProgressDoc } from "@/lib/domain/progress";
import { getLesson, getLessons, getProgress } from "@/lib/lessons";
import { getProject, getSnapshot } from "@/lib/projects";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Lesson",
};

export default async function LessonPage({
  params,
}: {
  params: Promise<{ id: string; lessonId: string }>;
}) {
  const { id, lessonId } = await params;
  const user = await requireUser(`/projects/${id}/learn/${lessonId}`);
  const project = await getProject(id, user.uid);
  if (!project) notFound();

  const [lesson, lessons, progress, profile, snapshot] = await Promise.all([
    getLesson(project.id, lessonId),
    getLessons(project.id),
    getProgress(project.id, user.uid),
    getUserProfile(user.uid),
    getSnapshot(project.id),
  ]);

  if (!lesson) notFound();

  after(() =>
    recordLessonViewed(project.id, lesson.id, lesson.order).catch(() => undefined),
  );

  const safeProgress = progress ?? emptyProgressDoc();
  const passed = safeProgress.lessons[lesson.id]?.passed === true;
  const position = lessons.findIndex((item) => item.id === lesson.id);
  const previous = position > 0 ? lessons[position - 1] : null;
  const next = position >= 0 && position < lessons.length - 1 ? lessons[position + 1] : null;
  const contents = new Map(snapshot?.files.map((file) => [file.path, file.content]) ?? []);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 sm:py-12">
      <Link
        href={`/projects/${project.id}/learn`}
        className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        All Foundations lessons
      </Link>

      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="label-mono">
            Pathway 1 · Lesson {lesson.order} of {lessons.length} · Part {lesson.part}
          </p>
          <h1 className="mt-2 text-3xl sm:text-4xl">{lesson.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StageBadge stage={project.stage} />
            <span className="path-chip">
              {project.owner}/{project.repo}
            </span>
            {passed ? (
              <span className="inline-flex h-6 items-center gap-1 rounded-md border border-[#1e5033] bg-[#0e2a1c] px-2 font-mono text-[0.625rem] tracking-[0.06em] text-[#8ce85f] uppercase">
                <Check className="size-3" aria-hidden="true" />
                Passed
              </span>
            ) : (
              <span className="inline-flex h-6 items-center rounded-md border border-[#584211] bg-[#2b1f06] px-2 font-mono text-[0.625rem] tracking-[0.06em] text-[#ffc53d] uppercase">
                +{lesson.xp} XP
              </span>
            )}
          </div>
        </div>
        <XpBadge totalXp={profile?.totalXp ?? 0} />
      </div>

      <PathwayNav projectId={project.id} active="learn" className="mt-6" />

      <section
        aria-labelledby="goal-heading"
        className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
      >
        <p className="label-mono">After this lesson you can</p>
        <p id="goal-heading" className="mt-2 text-[0.9375rem] leading-relaxed text-card-foreground">
          {lesson.goal}
        </p>
      </section>

      <article aria-labelledby="explain-heading" className="mt-8">
        <div className="flex items-center gap-2">
          <FileCode2 className="size-4 text-primary" aria-hidden="true" />
          <h2 id="explain-heading" className="text-xl">
            Read your code
          </h2>
        </div>
        <div className="mt-4 rounded-2xl border border-border bg-card p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-6">
          <LessonMarkdown text={lesson.explain} />
        </div>
      </article>

      <section aria-labelledby="code-heading" className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div className="flex items-center gap-2">
            <Code2 className="size-4 text-primary" aria-hidden="true" />
            <h2 id="code-heading" className="text-xl">
              Look at this code
            </h2>
          </div>
          <p className="font-mono text-[0.6875rem] tracking-[0.1em] text-muted-foreground uppercase">
            {lesson.codeRefs.length} files
          </p>
        </div>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          These are real files from your snapshot. Open one, follow the note, then come back
          to the quiz.
        </p>

        <div className="mt-4 space-y-3">
          {lesson.codeRefs.map((ref, index) => {
            const content = contents.get(ref.file);
            if (content === undefined) {
              return (
                <div
                  key={ref.file}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border bg-card p-4"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <FileChip path={ref.file} repoUrl={project.repoUrl} />
                    <p className="min-w-0 text-xs leading-relaxed text-muted-foreground">{ref.note}</p>
                  </div>
                  <span className="font-mono text-[0.625rem] text-muted-foreground uppercase">
                    snapshot missing
                  </span>
                </div>
              );
            }

            return (
              <CodeBlock
                key={ref.file}
                path={ref.file}
                content={content}
                repoUrl={project.repoUrl}
                note={ref.note}
                open={index === 0}
              />
            );
          })}
        </div>
      </section>

      <SpeechBubble mood={passed ? "proud" : "encouraging"} className="mt-8" label="Geko">
        {lesson.gekoTip}
      </SpeechBubble>

      <Quiz
        projectId={project.id}
        lessonId={lesson.id}
        quiz={lesson.quiz.map((question) => ({
          question: question.question,
          options: question.options,
        }))}
        xp={lesson.xp}
        alreadyPassed={passed}
        nextLesson={next ? { id: next.id, title: next.title } : null}
      />

      <nav
        aria-label="Lesson navigation"
        className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5"
      >
        {previous ? (
          <Button asChild variant="outline" size="sm">
            <Link href={`/projects/${project.id}/learn/${previous.id}`}>
              <ArrowLeft aria-hidden="true" />
              Previous
            </Link>
          </Button>
        ) : (
          <span />
        )}

        <Button asChild variant="ghost" size="sm">
          <Link href={`/projects/${project.id}/learn`}>All lessons</Link>
        </Button>

        {next ? (
          <Button asChild size="sm">
            <Link href={`/projects/${project.id}/learn/${next.id}`}>
              Next
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        ) : (
          <Button asChild variant="outline" size="sm">
            <Link href={`/projects/${project.id}/learn`}>
              <CircleCheck aria-hidden="true" />
              Finish
            </Link>
          </Button>
        )}
      </nav>

      <div
        className={cn(
          "mt-8 rounded-xl border border-border bg-card/70 px-4 py-3 text-xs leading-relaxed text-muted-foreground",
          !snapshot && "border-destructive/30 text-destructive",
        )}
      >
        {snapshot
          ? `Code shown from the stored snapshot (${snapshot.files.length} files). Nothing is fetched from GitHub while you read.`
          : "The stored snapshot is missing, so code blocks can't be shown. Open the project to re-run ingestion."}
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Bug,
  CheckCircle2,
  FileCode2,
  HelpCircle,
  Lightbulb,
  ListOrdered,
  RotateCcw,
  ShieldAlert,
} from "lucide-react";
import { SpeechBubble } from "@/components/brand/speech-bubble";
import { XpBadge } from "@/components/app/xp-badge";
import { CodeBlock } from "@/components/projects/code-block";
import { DebugQuiz } from "@/components/projects/debug-quiz";
import { DebugDetective } from "@/components/projects/debug-detective";
import { PathwayNav } from "@/components/projects/pathway-nav";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { getUserProfile } from "@/lib/auth/users";
import { getDebugSession } from "@/lib/debug";
import type { Confidence } from "@/lib/domain/debug";
import { emptyProgressDoc, type ProgressDoc } from "@/lib/domain/progress";
import { getProgress } from "@/lib/lessons";
import { getProject, getSnapshot } from "@/lib/projects";

export const metadata: Metadata = {
  title: "Debug Session",
};

export default async function DebugSessionPage({
  params,
}: {
  params: Promise<{ id: string; sid: string }>;
}) {
  const { id, sid } = await params;
  const user = await requireUser(`/projects/${id}/debug/${sid}`);
  const [project, profile] = await Promise.all([
    getProject(id, user.uid),
    getUserProfile(user.uid),
  ]);

  if (!project) notFound();

  const [session, snapshot, progress] = await Promise.all([
    getDebugSession(project.id, sid),
    getSnapshot(project.id),
    getProgress(project.id, user.uid),
  ]);

  if (!session) notFound();

  const safeProgress: ProgressDoc = progress ?? emptyProgressDoc();
  const isCompleted = safeProgress.debug[session.id]?.completed === true;

  const fileMap = new Map((snapshot?.files ?? []).map((f) => [f.path, f.content]));

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 sm:py-12">
      <Link
        href={`/projects/${project.id}/debug`}
        className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        All debug sessions
      </Link>

      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="label-mono">Debug session</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Root Cause & Fix Walkthrough
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Created on{" "}
            {new Date(session.createdAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        <XpBadge totalXp={profile?.totalXp ?? 0} />
      </div>

      <PathwayNav projectId={project.id} active="debug" className="mt-6" />

      {/* Reported Symptom Card */}
      <section className="mt-6 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="label-mono text-muted-foreground">Reported symptom</p>
          {isCompleted ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-[#1e5033] bg-[#0e2a1c] px-2 py-0.5 font-mono text-[0.6875rem] text-primary">
              <CheckCircle2 className="size-3" aria-hidden="true" />
              Completed (+30 XP)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-md border border-[#584211] bg-[#2b1f06] px-2 py-0.5 font-mono text-[0.6875rem] text-[#ffc53d]">
              <HelpCircle className="size-3" aria-hidden="true" />
              Quiz pending (+30 XP)
            </span>
          )}
        </div>
        <p className="mt-2 font-mono text-sm leading-relaxed text-foreground">
          &ldquo;{session.symptom}&rdquo;
        </p>
      </section>

      {session.status === "done" && session.likelyCauses ? (
        <DebugDetective symptom={session.symptom} causes={session.likelyCauses} />
      ) : null}

      {session.status === "failed" ? (
        <div className="mt-8 rounded-2xl border border-[#5a1c1c] bg-[#2c0f0f] p-6 text-sm text-[#ff7a70]">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-5 shrink-0" aria-hidden="true" />
            <h2 className="text-base font-semibold">Analysis could not be completed</h2>
          </div>
          <p className="mt-2 leading-relaxed text-[#ffb0a8]">
            {session.error ??
              "The AI couldn't isolate the bug with verified evidence files. Try rephrasing your symptom description."}
          </p>
          <Button asChild variant="outline" className="mt-4 gap-2 border-[#5a1c1c] bg-transparent text-[#ffb0a8]">
            <Link href={`/projects/${project.id}/debug`}>
              <RotateCcw className="size-4" aria-hidden="true" />
              Start a new session
            </Link>
          </Button>
        </div>
      ) : null}

      {session.status === "pending" ? (
        <div className="mt-8 rounded-2xl border border-border bg-card p-8 text-center">
          <Bug className="mx-auto size-8 animate-pulse text-primary" aria-hidden="true" />
          <h2 className="mt-3 text-lg font-semibold text-foreground">Analyzing your codebase</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Searching snapshot files and matching symptoms against your architecture. This usually takes 15–30 seconds.
          </p>
        </div>
      ) : null}

      {session.status === "done" && session.likelyCauses ? (
        <div className="mt-8 space-y-10">
          {/* Section 1: Likely Causes with Evidence Files */}
          <section aria-labelledby="causes-heading">
            <div className="flex items-center gap-2">
              <ShieldAlert className="size-5 text-primary" aria-hidden="true" />
              <h2 id="causes-heading" className="text-xl font-semibold text-foreground">
                Likely Causes ({session.likelyCauses.length})
              </h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Ground-truth causes identified in your own repository, backed by evidence files from your snapshot.
            </p>

            <div className="mt-4 space-y-4">
              {session.likelyCauses.map((cause, causeIdx) => (
                <div
                  key={causeIdx}
                  className="rounded-2xl border border-border bg-card p-5 sm:p-6"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="label-mono">Cause #{causeIdx + 1}</p>
                    <ConfidenceBadge confidence={cause.confidence} />
                  </div>

                  <p className="mt-2 text-sm leading-relaxed text-foreground">
                    {cause.cause}
                  </p>

                  {cause.evidenceFiles.length > 0 ? (
                    <div className="mt-4 space-y-2">
                      <p className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
                        <FileCode2 className="size-3.5 text-primary" aria-hidden="true" />
                        Evidence files ({cause.evidenceFiles.length}):
                      </p>
                      <div className="space-y-3 pt-1">
                        {cause.evidenceFiles.map((filePath) => {
                          const content = fileMap.get(filePath);
                          if (!content) {
                            return (
                              <div
                                key={filePath}
                                className="rounded-xl border border-border bg-[#0e141b] px-3.5 py-2 font-mono text-xs text-[#a9bccb]"
                              >
                                {filePath}
                              </div>
                            );
                          }
                          return (
                            <CodeBlock
                              key={filePath}
                              path={filePath}
                              content={content}
                              repoUrl={project.repoUrl}
                              note="Evidence cited by analysis"
                              open={causeIdx === 0}
                            />
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </section>

          {/* Section 2: Concrete Fix Steps */}
          {session.fixSteps && session.fixSteps.length > 0 ? (
            <section aria-labelledby="fix-heading">
              <div className="flex items-center gap-2">
                <ListOrdered className="size-5 text-primary" aria-hidden="true" />
                <h2 id="fix-heading" className="text-xl font-semibold text-foreground">
                  Step-by-Step Fix Directions ({session.fixSteps.length} steps)
                </h2>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Follow these ordered steps to resolve the issue safely without breaking neighbouring files.
              </p>

              <div className="mt-4 space-y-3">
                {session.fixSteps.map((step, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3.5 rounded-2xl border border-border bg-card p-4 sm:p-5"
                  >
                    <span className="grid size-6 shrink-0 place-items-center rounded-md border border-[#1e5033] bg-[#0e2a1c] font-mono text-xs font-semibold text-primary">
                      {idx + 1}
                    </span>
                    <p className="mt-0.5 text-sm leading-relaxed text-foreground">
                      {step}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {/* Section 3: Why It Works (Concept panel) */}
          {session.whyItWorks ? (
            <section aria-labelledby="why-heading">
              <div className="rounded-2xl border border-[#1e5033] bg-[#0e2a1c]/60 p-5 sm:p-6">
                <div className="flex items-center gap-2">
                  <Lightbulb className="size-5 text-primary" aria-hidden="true" />
                  <p className="label-mono text-primary">Underlying Concept</p>
                </div>
                <h2 id="why-heading" className="mt-2 text-xl font-semibold text-foreground">
                  {session.whyItWorks.concept}
                </h2>
                <div className="mt-3 text-sm leading-relaxed text-[#c2dfcd] space-y-2">
                  <p>{session.whyItWorks.explanation}</p>
                </div>
              </div>
            </section>
          ) : null}

          {/* Section 4: Geko Tip */}
          {session.gekoTip ? (
            <section aria-label="Geko's debugging tip">
              <SpeechBubble mood="calm">
                <p>{session.gekoTip}</p>
              </SpeechBubble>
            </section>
          ) : null}

          {/* Section 5: Quiz */}
          {session.quiz && session.quiz.length > 0 ? (
            <DebugQuiz
              projectId={project.id}
              sessionId={session.id}
              quiz={session.quiz.map((q) => ({
                question: q.question,
                options: q.options,
              }))}
              xp={session.xp ?? 30}
              alreadyCompleted={isCompleted}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  if (confidence === "high") {
    return (
      <span className="rounded-md border border-[#5a1c1c] bg-[#2c0f0f] px-2 py-0.5 font-mono text-[0.6875rem] text-[#ff7a70] uppercase">
        High confidence
      </span>
    );
  }
  if (confidence === "medium") {
    return (
      <span className="rounded-md border border-[#584211] bg-[#2b1f06] px-2 py-0.5 font-mono text-[0.6875rem] text-[#ffc53d] uppercase">
        Medium confidence
      </span>
    );
  }
  return (
    <span className="rounded-md border border-border bg-[#0e141b] px-2 py-0.5 font-mono text-[0.6875rem] text-muted-foreground uppercase">
      Low confidence
    </span>
  );
}

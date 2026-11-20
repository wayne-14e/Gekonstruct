import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Bug,
  CheckCircle2,
  Clock,
  ExternalLink,
  HelpCircle,
  XCircle,
} from "lucide-react";
import { SpeechBubble } from "@/components/brand/speech-bubble";
import { XpBadge } from "@/components/app/xp-badge";
import { DebugSymptomForm } from "@/components/projects/debug-symptom-form";
import { PathwayNav } from "@/components/projects/pathway-nav";
import { StageBadge } from "@/components/projects/stage-badge";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { getUserProfile } from "@/lib/auth/users";
import { getDebugSessionsUsed, listDebugSessions } from "@/lib/debug";
import { DEBUG_LIMITS, freeDebugSessionsRemaining } from "@/lib/domain/debug";
import { emptyProgressDoc, type ProgressDoc } from "@/lib/domain/progress";
import { getProgress } from "@/lib/lessons";
import { getGuidebook, getProject, getSnapshot } from "@/lib/projects";

export const metadata: Metadata = {
  title: "Debug & Learn",
};

export default async function DebugPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/projects/${id}/debug`);
  const [project, profile] = await Promise.all([
    getProject(id, user.uid),
    getUserProfile(user.uid),
  ]);

  if (!project) notFound();

  const [sessions, progress, guidebook, snapshot, recordedSessionsUsed] = await Promise.all([
    listDebugSessions(project.id),
    getProgress(project.id, user.uid),
    getGuidebook(project.id),
    getSnapshot(project.id),
    getDebugSessionsUsed(user.uid, project.id),
  ]);

  const safeProgress: ProgressDoc = progress ?? emptyProgressDoc();
  const sessionsUsed = Math.max(sessions.length, recordedSessionsUsed);
  const sessionsRemaining = freeDebugSessionsRemaining(sessionsUsed);
  const completedSessionCount = Object.values(safeProgress.debug).filter(
    (entry) => entry.completed,
  ).length;
  const debugReady = guidebook !== null && snapshot !== null;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
      <Link
        href={`/projects/${project.id}`}
        className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to {project.title}
      </Link>

      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="label-mono">Pathway 2</p>
          <h1 className="mt-2 truncate text-3xl sm:text-4xl">Debug & Learn</h1>
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

      <PathwayNav projectId={project.id} active="debug" className="mt-6" />

      <div className="mt-6">
        <SpeechBubble mood="calm">
          <p>
            Tell me what&apos;s breaking, paste an error message, or describe what goes wrong. I&apos;ll
            search your real files, isolate the likely causes with evidence, give you safe fix steps,
            and teach you the underlying concept so you never get stuck on it again.
          </p>
        </SpeechBubble>
      </div>

      {debugReady ? (
        sessionsRemaining > 0 ? (
          <div className="mt-8">
            <DebugSymptomForm projectId={project.id} remainingSessions={sessionsRemaining} />
          </div>
        ) : (
          <section className="mt-8 rounded-2xl border border-[#584211] bg-[#2b1f06] p-5 sm:p-6">
            <p className="label-mono text-[#ffc53d]">Free plan limit reached</p>
            <h2 className="mt-2 text-lg font-semibold text-foreground">
              No debug sessions remaining
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              This project has used all {DEBUG_LIMITS.freeSessionsPerProject} free debug sessions.
              Your past sessions are still available below.
            </p>
          </section>
        )
      ) : (
        <section className="mt-8 rounded-2xl border border-border bg-card p-6">
          <p className="label-mono">Locked</p>
          <h2 className="mt-2 text-lg font-semibold text-foreground">
            Debug unlocks after the map
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            The debug pathway matches your symptom against the stored snapshot and the
            architecture summary. Finish ingestion and the architecture map first, then come
            back with what is breaking.
          </p>
          <Button asChild className="mt-4" size="sm">
            <Link href={`/projects/${project.id}`}>
              Open the project
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </section>
      )}

      <section aria-labelledby="sessions-heading" className="mt-12">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="label-mono">Session history</p>
            <h2 id="sessions-heading" className="mt-1 text-xl font-semibold text-foreground">
              Past debug sessions ({sessions.length})
            </h2>
          </div>
          {completedSessionCount > 0 ? (
            <span className="rounded-md border border-[#1e5033] bg-[#0e2a1c] px-2.5 py-1 font-mono text-xs text-primary">
              {completedSessionCount} solved
            </span>
          ) : null}
        </div>

        {sessions.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-border p-8 text-center">
            <Bug className="mx-auto size-8 text-muted-foreground/60" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium text-foreground">No debug sessions yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Describe a bug or symptom above to start your first session and earn +30 XP.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {sessions.map((session) => {
              const isCompleted = safeProgress.debug[session.id]?.completed === true;

              return (
                <div
                  key={session.id}
                  className="flex flex-col justify-between gap-4 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-input sm:flex-row sm:items-center sm:p-5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {session.status === "done" ? (
                        isCompleted ? (
                          <span className="inline-flex items-center gap-1 rounded-md border border-[#1e5033] bg-[#0e2a1c] px-2 py-0.5 font-mono text-[0.6875rem] text-primary">
                            <CheckCircle2 className="size-3" aria-hidden="true" />
                            Completed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md border border-[#584211] bg-[#2b1f06] px-2 py-0.5 font-mono text-[0.6875rem] text-[#ffc53d]">
                            <HelpCircle className="size-3" aria-hidden="true" />
                            Quiz pending (+30 XP)
                          </span>
                        )
                      ) : session.status === "pending" ? (
                        <span className="inline-flex items-center gap-1 rounded-md border border-[#2b3a4a] bg-[#121c26] px-2 py-0.5 font-mono text-[0.6875rem] text-[#8ab4f8]">
                          <Clock className="size-3 animate-spin" aria-hidden="true" />
                          Analyzing
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md border border-[#5a1c1c] bg-[#2c0f0f] px-2 py-0.5 font-mono text-[0.6875rem] text-[#ff7a70]">
                          <XCircle className="size-3" aria-hidden="true" />
                          Failed
                        </span>
                      )}

                      <span className="text-xs text-muted-foreground">
                        {new Date(session.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <p className="mt-2 line-clamp-2 font-mono text-sm text-foreground">
                      &ldquo;{session.symptom}&rdquo;
                    </p>

                    {session.likelyCauses && session.likelyCauses.length > 0 ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {session.likelyCauses.length} likely cause
                        {session.likelyCauses.length > 1 ? "s" : ""} identified
                      </p>
                    ) : null}
                  </div>

                  <div className="shrink-0">
                    <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
                      <Link href={`/projects/${project.id}/debug/${session.id}`}>
                        {session.status === "done" ? "Open session" : "View status"}
                        <ArrowRight className="size-3.5" aria-hidden="true" />
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

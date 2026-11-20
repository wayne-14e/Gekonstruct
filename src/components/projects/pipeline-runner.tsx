"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, Loader2, Play, RotateCcw, Route } from "lucide-react";
import { toast } from "sonner";
import { SpeechBubble } from "@/components/brand/speech-bubble";
import { Button } from "@/components/ui/button";
import type { ProjectStage } from "@/lib/domain/project";
import { cn } from "@/lib/utils";

type StepKey = "ingest" | "architecture" | "lessons1" | "lessons2";

const STEPS: Array<{
  key: StepKey;
  label: string;
  detail: string;
  endpoint: string;
  success: string;
}> = [
  {
    key: "ingest",
    label: "Ingest the repository",
    detail:
      "Reads the default branch, skips noise, keeps up to 60 files and detects the stack. Nothing is written back to GitHub.",
    endpoint: "/api/pipeline/ingest",
    success: "Snapshot stored.",
  },
  {
    key: "architecture",
    label: "Map the architecture",
    detail:
      "Sends the snapshot to the analysis engine and checks every file it cites against your real files.",
    endpoint: "/api/pipeline/architecture",
    success: "Architecture map ready.",
  },
  {
    key: "lessons1",
    label: "Write the first lessons",
    detail:
      "Builds the first half of the Foundations pathway: what the project is, the request flow, and where data lives.",
    endpoint: "/api/pipeline/lessons1",
    success: "First half of the lessons stored.",
  },
  {
    key: "lessons2",
    label: "Finish the lessons",
    detail:
      "Adds auth, safe feature work and debugging lessons. Every code reference and quiz answer is checked against your snapshot.",
    endpoint: "/api/pipeline/lessons2",
    success: "Foundations lessons ready.",
  },
];

/**
 * Client orchestrator for the pipeline (BLUEPRINT §4). It POSTs stages in order and
 * refreshes the server component after each one, so progress always comes from Firestore
 * rather than local optimism. Re-rendering mid-run is safe: the next stage is derived from
 * `stage` plus the stored snapshot/guidebook/lessons, not from component state.
 */
export function PipelineRunner({
  projectId,
  stage,
  stageError,
  hasSnapshot,
  hasGuidebook,
  lessonCount,
}: {
  projectId: string;
  stage: ProjectStage;
  stageError: string | null;
  hasSnapshot: boolean;
  hasGuidebook: boolean;
  lessonCount: number;
}) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [activeStep, setActiveStep] = useState<StepKey | null>(null);
  const [failedStep, setFailedStep] = useState<StepKey | null>(
    stage === "failed:ingested"
      ? "ingest"
      : stage === "failed:architecture"
        ? "architecture"
        : stage === "failed:lessons1"
          ? "lessons1"
          : stage === "failed:lessons2"
            ? "lessons2"
            : null,
  );
  const [error, setError] = useState<string | null>(stageError);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!running) return;
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1_000));
    }, 1_000);
    return () => window.clearInterval(timer);
  }, [running]);

  const ingestDone = hasSnapshot && stage !== "failed:ingested";
  const mappedDone =
    hasGuidebook &&
    stage !== "created" &&
    stage !== "ingested" &&
    stage !== "failed:ingested" &&
    stage !== "failed:architecture";
  const lessons1Done = mappedDone && lessonCount > 0 && stage !== "failed:lessons1";
  const lessons2Done = lessons1Done && stage === "ready";
  const completedCount = [ingestDone, mappedDone, lessons1Done, lessons2Done].filter(Boolean).length;
  const failedStepLabel = STEPS.find((step) => step.key === failedStep)?.label ?? null;

  const startIndex = !ingestDone ? 0 : !mappedDone ? 1 : !lessons1Done ? 2 : !lessons2Done ? 3 : 4;
  const startStep = STEPS[startIndex];

  async function run() {
    if (running || !startStep) return;

    setRunning(true);
    setError(null);
    setFailedStep(null);
    setElapsed(0);

    try {
      for (let index = startIndex; index < STEPS.length; index += 1) {
        const step = STEPS[index];
        if (!step) break;

        setActiveStep(step.key);

        const response = await fetch(step.endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId }),
        });
        const payload: unknown = await response.json().catch(() => null);

        if (response.status === 401) {
          const message = "Your session expired. Sign in again to continue this pipeline.";
          setError(message);
          setFailedStep(step.key);
          toast.error(message);
          router.push(`/login?next=${encodeURIComponent(`/projects/${projectId}`)}`);
          return;
        }

        if (!response.ok || !isSuccess(payload)) {
          const message = readError(payload) ?? `${step.label} failed (HTTP ${response.status}).`;
          setError(message);
          setFailedStep(step.key);
          toast.error(message);
          router.refresh();
          return;
        }
      }

      toast.success("Your guidebook is ready — map and lessons.");
      router.refresh();
    } catch {
      const message = "We couldn't reach the server. Check your connection and try again.";
      setError(message);
      setFailedStep(startStep.key);
      toast.error(message);
    } finally {
      setActiveStep(null);
      setRunning(false);
    }
  }

  function stateFor(key: StepKey): "done" | "active" | "failed" | "pending" {
    if (activeStep === key) return "active";
    if (failedStep === key) return "failed";
    if (key === "ingest") return ingestDone ? "done" : "pending";
    if (key === "architecture") return mappedDone ? "done" : "pending";
    if (key === "lessons1") return lessons1Done ? "done" : "pending";
    return lessons2Done ? "done" : "pending";
  }

  const label = running
    ? `running · ${elapsed}s`
    : failedStep
      ? "stopped"
      : "ready to read";
  const heading =
    startIndex <= 1
      ? startIndex === 0
        ? "Read your repository"
        : "Map your architecture"
      : "Write your lessons";
  const buttonLabel = running
    ? "Working…"
    : failedStep === "ingest"
      ? "Retry ingestion"
      : failedStep === "architecture"
        ? "Retry the map"
        : failedStep === "lessons1"
          ? "Retry the first lessons"
          : failedStep === "lessons2"
            ? "Retry the final lessons"
            : startIndex === 0
              ? "Start the pipeline"
              : startIndex === 1
                ? "Build the architecture map"
                : startIndex === 2
                  ? "Write the first lessons"
                  : "Finish the lessons";

  return (
    <section
      aria-labelledby="pipeline-heading"
      className="rounded-2xl border border-border bg-card p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="label-mono">Pipeline</p>
          <h2 id="pipeline-heading" className="mt-2 text-xl">
            {heading}
          </h2>
        </div>
        <span
          className={cn(
            "font-mono text-[0.6875rem] tracking-[0.12em] uppercase",
            running ? "text-primary" : failedStep ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {label}
        </span>
      </div>

      <div
        className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-secondary"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={STEPS.length}
        aria-valuenow={completedCount}
        aria-label={`${completedCount} of ${STEPS.length} pipeline steps saved`}
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300"
          style={{ width: `${(completedCount / STEPS.length) * 100}%` }}
        />
      </div>

      {mappedDone ? (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-[#0e141b] px-4 py-3">
          <Route className="size-4 shrink-0 text-primary" aria-hidden="true" />
          <p className="min-w-0 flex-1 text-sm text-muted-foreground">
            Your architecture map is ready. You can read it while the lessons are written.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link href={`/projects/${projectId}/overview`}>Open the map</Link>
          </Button>
        </div>
      ) : null}

      <ol className="mt-5 space-y-3" aria-live="polite">
        {STEPS.map((step, index) => {
          const state = stateFor(step.key);
          const dimmed = index > startIndex && !running && !failedStep;
          const status =
            state === "done"
              ? "saved"
              : state === "active"
                ? "running"
                : state === "failed"
                  ? "failed"
                  : index === startIndex
                    ? "next"
                    : "waiting";
          return (
            <li key={step.key} className={cn("flex items-start gap-3", dimmed && "opacity-60")}>
              <StepIcon state={state} />
              <div className="flex min-w-0 flex-1 items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{step.label}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    {step.detail}
                  </p>
                </div>
                <span
                  className={cn(
                    "mt-0.5 shrink-0 font-mono text-[0.625rem] tracking-[0.08em] uppercase",
                    state === "done" && "text-[#8ce85f]",
                    state === "active" && "text-primary",
                    state === "failed" && "text-destructive",
                    state === "pending" && "text-muted-foreground",
                  )}
                >
                  {status}
                </span>
              </div>
            </li>
          );
        })}
      </ol>

      {error ? (
        <div
          role="alert"
          className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <p className="font-semibold">
              {failedStepLabel ? `${failedStepLabel} stopped` : "The pipeline stopped"}
            </p>
            <p className="mt-0.5 leading-relaxed">{error}</p>
            {completedCount > 0 ? (
              <p className="mt-1 text-xs leading-relaxed text-[#ffb0a8]">
                {completedCount} earlier {completedCount === 1 ? "step is" : "steps are"} saved.
                Retrying continues from &ldquo;{failedStepLabel ?? startStep?.label}&rdquo; and
                reuses them.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button type="button" size="lg" onClick={run} disabled={running || startIndex >= STEPS.length}>
          {running ? (
            <>
              <Loader2 className="animate-spin" aria-hidden="true" />
              Working…
            </>
          ) : failedStep ? (
            <>
              <RotateCcw aria-hidden="true" />
              {buttonLabel}
            </>
          ) : (
            <>
              <Play aria-hidden="true" />
              {buttonLabel}
            </>
          )}
        </Button>
        <p className="font-mono text-[0.6875rem] tracking-[0.08em] text-muted-foreground uppercase">
          {startIndex === 0
            ? "60 files max · 150k characters"
            : startIndex === 1
              ? "One analysis call · ~20–60s"
              : "One model call per half · 60s budget"}
        </p>
      </div>

      <SpeechBubble mood="encouraging" className="mt-6" label="Geko">
        {startIndex === 0
          ? "I read the tree, skip node_modules and lockfiles, and keep only the files that explain how this project works."
          : startIndex === 1
            ? "Now I map what I kept: the layers, the path a request takes, and the concepts you need to name. Every file I mention will be one that really exists in your repo."
            : "Lessons come straight from your snapshot and the map. Each one points at real files, and its quiz is answerable only if you read that lesson."}
      </SpeechBubble>
    </section>
  );
}

function StepIcon({ state }: { state: "done" | "active" | "pending" | "failed" }) {
  if (state === "active") {
    return (
      <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-md border border-[#1e5033] bg-[#0e2a1c] text-primary">
        <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
      </span>
    );
  }
  if (state === "failed") {
    return (
      <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-md border border-destructive/30 bg-destructive/12 text-destructive">
        <AlertTriangle className="size-3.5" aria-hidden="true" />
      </span>
    );
  }
  if (state === "done") {
    return (
      <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-md border border-[#1e5033] bg-[#0e2a1c] text-primary">
        <Check className="size-3.5" aria-hidden="true" />
      </span>
    );
  }
  return (
    <span
      className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-md border border-border bg-secondary"
      aria-hidden="true"
    >
      <span className="size-1.5 rounded-full bg-muted-foreground" />
    </span>
  );
}

function isSuccess(value: unknown): value is { ok: true } {
  return (
    typeof value === "object" &&
    value !== null &&
    "ok" in value &&
    (value as { ok: unknown }).ok === true
  );
}

function readError(value: unknown): string | null {
  if (typeof value !== "object" || value === null || !("error" in value)) return null;
  const error = (value as { error: unknown }).error;
  return typeof error === "string" && error.length > 0 ? error : null;
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, Play, RotateCcw, Route } from "lucide-react";
import { toast } from "sonner";
import { SpeechBubble } from "@/components/brand/speech-bubble";
import { Button } from "@/components/ui/button";
import type { ProjectStage } from "@/lib/domain/project";
import {
  initialFailedStep,
  resolveRunnerProgress,
  type StepKey,
  type StepState,
} from "@/lib/pipeline/runner-state";
import { cn } from "@/lib/utils";

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
 * refreshes the server component after each one, so progress stays synced with Firestore
 * while client state immediately marks completed stages green.
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
  const [failedStep, setFailedStep] = useState<StepKey | null>(() => initialFailedStep(stage));
  const [completedSteps, setCompletedSteps] = useState<Set<StepKey>>(() => new Set());
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

  const { done, states, completedCount, startIndex } = resolveRunnerProgress({
    stage,
    hasSnapshot,
    hasGuidebook,
    lessonCount,
    activeStep,
    failedStep,
    completedSteps,
  });

  const mappedDone = done.architecture;
  const failedStepLabel = STEPS.find((step) => step.key === failedStep)?.label ?? null;
  const startStep = STEPS[startIndex];

  async function run() {
    if (running || !startStep) return;

    setRunning(true);
    setError(null);
    setFailedStep(null);
    setElapsed(0);

    let currentStepKey: StepKey = startStep.key;

    try {
      for (let index = startIndex; index < STEPS.length; index += 1) {
        const step = STEPS[index];
        if (!step) break;

        currentStepKey = step.key;
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

        setCompletedSteps((prev) => {
          const next = new Set(prev);
          next.add(step.key);
          return next;
        });
        router.refresh();
      }

      toast.success("Your guidebook is ready — map and lessons.");
    } catch {
      const message = "We couldn't reach the server. Check your connection and try again.";
      setError(message);
      setFailedStep(currentStepKey);
      toast.error(message);
    } finally {
      setActiveStep(null);
      setRunning(false);
    }
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
          <p className="label-mono flex items-center gap-1.5">
            {running ? (
              <span
                aria-hidden="true"
                className="inline-block size-1.5 animate-pulse rounded-full bg-primary shadow-[0_0_8px_#5be000]"
              />
            ) : null}
            Pipeline
          </p>
          <h2 id="pipeline-heading" className="mt-2 text-xl">
            {heading}
          </h2>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 font-mono text-[0.6875rem] tracking-[0.12em] uppercase",
            running ? "text-primary" : failedStep ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {running ? (
            <span className="relative flex size-2" aria-hidden="true">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-primary" />
            </span>
          ) : null}
          {label}
        </span>
      </div>

      <div
        className="relative mt-4 h-1.5 w-full overflow-hidden rounded-full bg-secondary"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={STEPS.length}
        aria-valuenow={completedCount}
        aria-label={`${completedCount} of ${STEPS.length} pipeline steps saved`}
      >
        <div
          className={cn(
            "h-full rounded-full bg-primary transition-[width] duration-500 ease-out",
            completedCount > 0 && "shadow-[0_0_12px_rgba(91,224,0,0.45)]",
          )}
          style={{ width: `${(completedCount / STEPS.length) * 100}%` }}
        />
        {running ? (
          <div
            aria-hidden="true"
            className="animate-sweep pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-primary/80 to-transparent"
          />
        ) : null}
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

      <div className="relative mt-5 overflow-hidden rounded-xl border border-border bg-[#090e13] px-4 py-4 sm:px-5">
        <div
          aria-hidden="true"
          className="field-grid pointer-events-none absolute inset-0 opacity-35"
        />

        <ol className="relative space-y-3" aria-live="polite">
          {STEPS.map((step, index) => {
            const state = states[step.key];
            const isNext = state === "pending" && index === startIndex && !running;
            const dimmed = index > startIndex && !running && !failedStep;
            const isLast = index === STEPS.length - 1;
            const status =
              state === "done"
                ? "saved"
                : state === "active"
                  ? "running"
                  : state === "failed"
                    ? "failed"
                    : isNext
                      ? "next"
                      : "waiting";

            return (
              <li key={step.key} className="relative flex items-stretch gap-3">
                <div className="relative flex w-7 shrink-0 flex-col items-center">
                  <StepDot state={state} isNext={isNext} />
                  {!isLast ? <StepConnector state={state} /> : null}
                </div>

                <div
                  className={cn(
                    "relative min-w-0 flex-1 overflow-hidden rounded-xl border px-3.5 py-2.5 transition-colors duration-300",
                    state === "active"
                      ? "border-primary/60 bg-[#0f1c13] shadow-[0_0_26px_rgba(91,224,0,0.10)]"
                      : state === "done"
                        ? "border-primary/35 bg-[#0c1810]"
                        : state === "failed"
                          ? "border-destructive/40 bg-destructive/10"
                          : isNext
                            ? "border-[#324358] bg-[#0e141b]"
                            : "border-border bg-[#0e141b]",
                    dimmed && "opacity-60",
                  )}
                >
                  {state === "active" ? (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 top-0 h-0.5 overflow-hidden bg-primary/15"
                    >
                      <div className="animate-sweep h-full w-1/3 bg-gradient-to-r from-transparent via-primary to-transparent" />
                    </div>
                  ) : null}

                  <div className="flex min-w-0 items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">{step.label}</p>
                      <p
                        className={cn(
                          "mt-0.5 text-xs leading-relaxed",
                          state === "active"
                            ? "text-[#b7d6c1]"
                            : state === "done"
                              ? "text-[#9ec3aa]"
                              : "text-muted-foreground",
                        )}
                      >
                        {step.detail}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "mt-0.5 inline-flex shrink-0 items-center gap-1.5 font-mono text-[0.625rem] tracking-[0.08em] uppercase",
                        state === "done" && "text-primary",
                        state === "active" && "text-primary",
                        state === "failed" && "text-destructive",
                        state === "pending" &&
                          (isNext ? "text-[#a9bccb]" : "text-muted-foreground"),
                      )}
                    >
                      {state === "active" ? (
                        <span
                          aria-hidden="true"
                          className="inline-block size-1.5 animate-pulse rounded-full bg-primary shadow-[0_0_8px_#5be000]"
                        />
                      ) : null}
                      {status}
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

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
              <span className="relative flex size-2.5" aria-hidden="true">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary-foreground/75" />
                <span className="relative inline-flex size-2.5 rounded-full bg-primary-foreground" />
              </span>
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

function StepDot({ state, isNext }: { state: StepState; isNext: boolean }) {
  if (state === "active") {
    return (
      <span className="relative z-10 mt-3 grid size-7 shrink-0 place-items-center rounded-full border border-primary bg-[#0f2617] shadow-[0_0_20px_rgba(91,224,0,0.45)] transition-all duration-300">
        <span
          aria-hidden="true"
          className="absolute inset-0 animate-ping rounded-full bg-primary/35"
        />
        <span
          aria-hidden="true"
          className="relative size-2.5 rounded-full bg-primary shadow-[0_0_10px_#5be000]"
        />
      </span>
    );
  }
  if (state === "failed") {
    return (
      <span className="relative z-10 mt-3 grid size-7 shrink-0 place-items-center rounded-full border border-destructive bg-[#2c0f0f] text-destructive shadow-[0_0_14px_rgba(255,122,112,0.3)] transition-all duration-300">
        <AlertTriangle className="size-3.5" aria-hidden="true" />
      </span>
    );
  }
  if (state === "done") {
    return (
      <span className="relative z-10 mt-3 grid size-7 shrink-0 place-items-center rounded-full border border-primary bg-primary text-primary-foreground shadow-[0_0_16px_rgba(91,224,0,0.42)] transition-all duration-300">
        <Check className="size-3.5 stroke-[2.75]" aria-hidden="true" />
      </span>
    );
  }
  return (
    <span
      className={cn(
        "relative z-10 mt-3 grid size-7 shrink-0 place-items-center rounded-full border transition-colors duration-300",
        isNext ? "border-primary/45 bg-[#102116]" : "border-border bg-[#0e141b]",
      )}
      aria-hidden="true"
    >
      <span
        className={cn(
          "size-2 rounded-full transition-colors duration-300",
          isNext ? "bg-primary" : "bg-muted-foreground/55",
        )}
      />
    </span>
  );
}

function StepConnector({ state }: { state: StepState }) {
  return (
    <div aria-hidden="true" className="relative -mb-6 flex w-3 flex-1 justify-center">
      <div
        className={cn(
          "h-full w-0.5 transition-colors duration-300",
          state === "done"
            ? "bg-gradient-to-b from-primary via-primary to-primary/70 shadow-[0_0_10px_rgba(91,224,0,0.4)]"
            : state === "active"
              ? "bg-gradient-to-b from-primary/60 via-[#2dd4bf]/30 to-border"
              : state === "failed"
                ? "bg-gradient-to-b from-destructive/60 to-border"
                : "bg-border",
        )}
      />
      {state === "active" ? (
        <span className="animate-trace absolute left-1/2 top-0 size-1.5 -translate-x-1/2 rounded-full bg-primary shadow-[0_0_12px_2px_rgba(91,224,0,0.75)]" />
      ) : null}
    </div>
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

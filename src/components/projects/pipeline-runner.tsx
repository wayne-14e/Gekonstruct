"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, Loader2, Play, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { SpeechBubble } from "@/components/brand/speech-bubble";
import { Button } from "@/components/ui/button";
import type { ProjectStage } from "@/lib/domain/project";
import { cn } from "@/lib/utils";

type StepKey = "ingest" | "architecture";

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
    success: "Architecture map ready. Open it from the project page.",
  },
];

const FUTURE_STEPS = [
  {
    label: "Write the lessons",
    detail: "Foundations pathway with quizzes · Phase 4",
  },
  {
    label: "Open the debug guide",
    detail: "Symptom-led explanations · Phase 5",
  },
] as const;

/**
 * Client orchestrator for the pipeline (BLUEPRINT §4). It POSTs stages in order and
 * refreshes the server component after each one, so progress always comes from Firestore
 * rather than local optimism. Re-rendering mid-run is safe: the next stage is derived
 * from `stage` + `hasSnapshot`, not from component state.
 */
export function PipelineRunner({
  projectId,
  stage,
  stageError,
  hasSnapshot,
}: {
  projectId: string;
  stage: ProjectStage;
  stageError: string | null;
  hasSnapshot: boolean;
}) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [activeStep, setActiveStep] = useState<StepKey | null>(null);
  const [failedStep, setFailedStep] = useState<StepKey | null>(
    stage === "failed:ingested" ? "ingest" : stage === "failed:architecture" ? "architecture" : null,
  );
  const [error, setError] = useState<string | null>(stageError);

  const ingestDone = hasSnapshot && stage !== "failed:ingested";
  const startIndex = ingestDone ? 1 : 0;
  const startStep = STEPS[startIndex];

  async function run() {
    if (running || !startStep) return;

    setRunning(true);
    setError(null);
    setFailedStep(null);

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

        if (!response.ok || !isSuccess(payload)) {
          const message = readError(payload) ?? `${step.label} failed (HTTP ${response.status}).`;
          setError(message);
          setFailedStep(step.key);
          toast.error(message);
          router.refresh();
          return;
        }
      }

      toast.success(STEPS[STEPS.length - 1]?.success ?? "Pipeline finished.");
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
    return "pending";
  }

  const label = running ? "running" : failedStep ? "stopped" : "ready to read";
  const buttonLabel = running
    ? "Working…"
    : failedStep === "ingest"
      ? "Retry ingestion"
      : failedStep === "architecture"
        ? "Retry the map"
        : startIndex === 0
          ? "Start the pipeline"
          : "Build the architecture map";

  return (
    <section
      aria-labelledby="pipeline-heading"
      className="rounded-2xl border border-border bg-card p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="label-mono">Pipeline</p>
          <h2 id="pipeline-heading" className="mt-2 text-xl">
            {startIndex === 0 ? "Read your repository" : "Map your architecture"}
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

      <ol className="mt-5 space-y-3">
        {STEPS.map((step, index) => {
          const state = stateFor(step.key);
          const dimmed = index > startIndex && !running && !failedStep;
          return (
            <li key={step.key} className={cn("flex gap-3", dimmed && "opacity-60")}>
              <StepIcon state={state} />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{step.label}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  {step.detail}
                </p>
              </div>
            </li>
          );
        })}

        {FUTURE_STEPS.map((step) => (
          <li key={step.label} className="flex gap-3 opacity-55">
            <StepIcon state="pending" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">{step.label}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{step.detail}</p>
            </div>
          </li>
        ))}
      </ol>

      {error ? (
        <div
          role="alert"
          className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p className="leading-relaxed">{error}</p>
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button type="button" size="lg" onClick={run} disabled={running}>
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
          {startIndex === 0 ? "60 files max · 150k characters" : "One analysis call · ~20–60s"}
        </p>
      </div>

      <SpeechBubble mood="encouraging" className="mt-6" label="Geko">
        {startIndex === 0
          ? "I read the tree, skip node_modules and lockfiles, and keep only the files that explain how this project works."
          : "Now I map what I kept: the layers, the path a request takes, and the concepts you need to name. Every file I mention will be one that really exists in your repo."}
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

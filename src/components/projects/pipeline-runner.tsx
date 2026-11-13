"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, Loader2, Play, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { SpeechBubble } from "@/components/brand/speech-bubble";
import { Button } from "@/components/ui/button";
import type { ProjectStage } from "@/lib/domain/project";
import { cn } from "@/lib/utils";

const FUTURE_STEPS = [
  {
    label: "Map the architecture",
    detail: "Layers, data flow and concepts · Phase 3",
  },
  {
    label: "Write the lessons",
    detail: "Foundations pathway with quizzes · Phase 4",
  },
  {
    label: "Open the debug guide",
    detail: "Symptom-led explanations · Phase 5",
  },
] as const;

export function PipelineRunner({
  projectId,
  stage,
  stageError,
}: {
  projectId: string;
  stage: ProjectStage;
  stageError: string | null;
}) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(stageError);

  const failed = stage.startsWith("failed:");

  async function run() {
    if (running) return;

    setRunning(true);
    setError(null);
    try {
      const response = await fetch("/api/pipeline/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      const payload: unknown = await response.json().catch(() => null);

      if (!response.ok || !isSuccess(payload)) {
        const message = readError(payload) ?? `Ingestion failed (HTTP ${response.status}).`;
        setError(message);
        toast.error(message);
        return;
      }

      toast.success("Snapshot stored. The repository is ready for the architecture map.");
      router.refresh();
    } catch {
      const message = "We couldn't reach the server. Check your connection and try again.";
      setError(message);
      toast.error(message);
    } finally {
      setRunning(false);
    }
  }

  const ingestState = running ? "active" : failed ? "failed" : "ready";
  const label = running ? "running" : failed ? "stopped" : "ready to read";

  return (
    <section
      aria-labelledby="pipeline-heading"
      className="rounded-2xl border border-border bg-card p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="label-mono">Pipeline</p>
          <h2 id="pipeline-heading" className="mt-2 text-xl">
            Read your repository
          </h2>
        </div>
        <span
          className={cn(
            "font-mono text-[0.6875rem] tracking-[0.12em] uppercase",
            running ? "text-primary" : failed ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {label}
        </span>
      </div>

      <ol className="mt-5 space-y-3">
        <li className="flex gap-3">
          <StepIcon state={ingestState} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Ingest the repository</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              Reads the default branch, skips noise, keeps up to 60 files and detects the
              stack. Nothing is written back to GitHub.
            </p>
          </div>
        </li>

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
              Reading…
            </>
          ) : failed ? (
            <>
              <RotateCcw aria-hidden="true" />
              Retry ingestion
            </>
          ) : (
            <>
              <Play aria-hidden="true" />
              Start ingestion
            </>
          )}
        </Button>
        <p className="font-mono text-[0.6875rem] tracking-[0.08em] text-muted-foreground uppercase">
          60 files max · 150k characters
        </p>
      </div>

      <SpeechBubble mood="encouraging" className="mt-6" label="Geko">
        I read the tree, skip node_modules and lockfiles, and keep only the files that
        explain how this project works.
      </SpeechBubble>
    </section>
  );
}

function StepIcon({ state }: { state: "ready" | "active" | "pending" | "failed" }) {
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
  if (state === "ready") {
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

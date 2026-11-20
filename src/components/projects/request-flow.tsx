"use client";

import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { markRequestStepUnderstood } from "@/app/actions/progress";
import { InlineText } from "@/components/projects/guidebook-parts";
import type { GuidebookDoc } from "@/lib/domain/architecture";

type RequestStep = GuidebookDoc["architecture"]["dataFlow"][number];

export function RequestFlow({
  projectId,
  steps,
  initialUnderstoodSteps,
}: {
  projectId: string;
  steps: RequestStep[];
  initialUnderstoodSteps: number[];
}) {
  const [understoodSteps, setUnderstoodSteps] = useState(() =>
    Array.from(new Set(initialUnderstoodSteps.filter((index) => index < steps.length))).sort(
      (left, right) => left - right,
    ),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeIndex = steps.findIndex((_, index) => !understoodSteps.includes(index));

  async function markUnderstood(stepIndex: number) {
    setSaving(true);
    setError(null);
    try {
      const result = await markRequestStepUnderstood({ projectId, stepIndex });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setUnderstoodSteps(result.understoodSteps);
    } catch {
      setError("We couldn't save that step. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-labelledby="request-heading" data-overview-section="flow">
      <div className="flex items-center gap-2">
        <ArrowRight className="size-4 text-primary" aria-hidden="true" />
        <h2 id="request-heading" className="text-xl">
          One request, start to finish
        </h2>
      </div>
      <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        Follow one real request through the code. Mark each step understood to move on;
        your progress is saved.
      </p>

      <ol className="mt-5 space-y-3">
        {steps.map((step, index) => {
          const understood = understoodSteps.includes(index);
          const active = activeIndex === index;

          return (
            <li
              key={`${step.from}-${step.to}-${index}`}
              aria-current={active ? "step" : undefined}
              className={
                active
                  ? "rounded-2xl border border-primary/60 bg-[#101c13] p-4 shadow-[0_0_24px_rgba(91,224,0,.08)] sm:p-5"
                  : understood
                    ? "rounded-2xl border border-primary/20 bg-card p-4 sm:p-5"
                    : "rounded-2xl border border-border bg-card/60 p-4 opacity-70 sm:p-5"
              }
            >
              <div className="flex items-start gap-3">
                <span
                  className={
                    understood
                      ? "grid size-7 shrink-0 place-items-center rounded-full border border-primary/50 bg-[#102116] text-primary"
                      : active
                        ? "grid size-7 shrink-0 place-items-center rounded-full border border-primary bg-primary font-mono text-xs font-bold text-primary-foreground"
                        : "grid size-7 shrink-0 place-items-center rounded-full border border-border font-mono text-xs text-muted-foreground"
                  }
                >
                  {understood ? <Check className="size-4" aria-hidden="true" /> : index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-foreground">
                    <span>{step.from}</span>
                    <ArrowRight className="size-3.5 text-primary" aria-hidden="true" />
                    <span>{step.to}</span>
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    <InlineText text={step.whatHappens} />
                  </p>
                  {active ? (
                    <button
                      type="button"
                      onClick={() => void markUnderstood(index)}
                      disabled={saving}
                      className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground disabled:cursor-wait disabled:opacity-60"
                    >
                      {saving ? "Saving…" : "Understood"}
                      {!saving ? <ArrowRight className="size-4" aria-hidden="true" /> : null}
                    </button>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      {error ? (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <p className="mt-3 font-mono text-xs text-muted-foreground" aria-live="polite">
        {activeIndex < 0
          ? `All ${steps.length} request steps understood.`
          : `${understoodSteps.length} of ${steps.length} steps understood.`}
      </p>
    </section>
  );
}

"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, GitBranch } from "lucide-react";
import type { GuidebookDoc } from "@/lib/domain/architecture";

export function ArchitectureTrace({ guidebook }: { guidebook: GuidebookDoc }) {
  const [traceStep, setTraceStep] = useState(0);
  const trace = guidebook.architecture.dataFlow[traceStep];
  const total = guidebook.architecture.dataFlow.length;

  return (
    <section aria-labelledby="trace-heading">
      <div className="flex items-center gap-2">
        <GitBranch className="size-4 text-primary" aria-hidden="true" />
        <h2 id="trace-heading" className="text-xl">Trace</h2>
      </div>
      <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        Follow one request through the project, one step at a time.
      </p>

      <div className="mt-5 rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <p className="label-mono">Request trace</p>
          <span className="font-mono text-xs text-muted-foreground">{traceStep + 1} / {total}</span>
        </div>
        {trace ? (
          <div className="mt-5">
            <div className="flex flex-wrap items-center gap-2 text-base font-semibold">
              <span className="rounded-lg border border-border bg-[#0e141b] px-3 py-2">{trace.from}</span>
              <ArrowRight className="size-4 text-primary" aria-hidden="true" />
              <span className="rounded-lg border border-primary/40 bg-[#102116] px-3 py-2">{trace.to}</span>
            </div>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {trace.whatHappens}
            </p>
          </div>
        ) : null}
        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setTraceStep((step) => Math.max(0, step - 1))}
            disabled={traceStep === 0}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm disabled:opacity-40"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            Previous
          </button>
          <button
            type="button"
            onClick={() => setTraceStep((step) => Math.min(total - 1, step + 1))}
            disabled={traceStep === total - 1}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground disabled:opacity-40"
          >
            Next step
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}

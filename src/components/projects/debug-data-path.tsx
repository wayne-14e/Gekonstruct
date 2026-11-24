"use client";

import { useState } from "react";
import {
  ArrowRight,
  Bug,
  CornerDownRight,
  ExternalLink,
  FileCode2,
  MousePointerClick,
} from "lucide-react";
import { InlineText, fileUrl } from "@/components/projects/guidebook-parts";
import type { DataPath } from "@/lib/domain/debug";
import { cn } from "@/lib/utils";

/**
 * The bug's signal trace (BLUEPRINT §6 debug pathway).
 *
 * A learner should be able to follow the data from the trigger to the break instead of
 * reading another wall of prose. Only the active hop explains itself, so the path stays
 * scannable and the eye keeps moving down the rail.
 */
export function DebugDataPath({ dataPath, repoUrl }: { dataPath: DataPath; repoUrl: string }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const steps = dataPath.steps;
  const activeStep = steps[activeIndex];

  return (
    <section
      aria-labelledby="data-path-heading"
      className="mt-8 overflow-hidden rounded-2xl border border-border bg-[#090e13]"
    >
      <div className="relative border-b border-border/70 px-5 py-4 sm:px-6">
        <div aria-hidden className="field-grid pointer-events-none absolute inset-0 opacity-40" />
        <div className="relative flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="label-mono flex items-center gap-1.5 text-[#2dd4bf]">
              <span className="inline-block size-1.5 animate-pulse rounded-full bg-[#2dd4bf]" />
              Signal trace
            </p>
            <h2 id="data-path-heading" className="mt-1 text-xl font-semibold text-foreground">
              Follow the data to the bug
            </h2>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Each hop is a real file. Tap one to see what it does to the data before the break.
            </p>
          </div>
          <div className="text-right">
            <p className="font-mono text-[0.625rem] tracking-[0.12em] text-muted-foreground uppercase">
              hop {activeIndex + 1} / {steps.length}
            </p>
            <div className="mt-1.5 flex gap-1" aria-hidden>
              {steps.map((step, index) => (
                <span
                  key={`${step.file}-${index}`}
                  className={cn(
                    "h-1 w-5 rounded-full transition-colors",
                    index === activeIndex
                      ? "bg-primary"
                      : index < activeIndex
                        ? "bg-primary/40"
                        : "bg-border",
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="relative px-5 py-5 sm:px-6">
        <div className="relative">
          <div
            aria-hidden
            className="absolute bottom-4 left-[13px] top-4 w-px bg-gradient-to-b from-[#ffc53d]/60 via-primary/50 to-[#ff7a70]/70"
          />
          <span
            aria-hidden
            className="animate-trace absolute left-[11px] top-0 size-1.5 rounded-full bg-primary shadow-[0_0_14px_2px_rgba(91,224,0,0.55)]"
          />

          <div className="space-y-3">
            <div className="relative flex items-start gap-3">
              <span className="relative z-10 grid size-7 shrink-0 place-items-center rounded-md border border-[#584211] bg-[#2b1f06] text-[#ffc53d]">
                <MousePointerClick className="size-3.5" aria-hidden="true" />
              </span>
              <div className="min-w-0 pt-0.5">
                <p className="font-mono text-[0.625rem] tracking-[0.12em] text-[#ffc53d] uppercase">
                  In
                </p>
                <p className="mt-0.5 text-sm leading-relaxed text-foreground">{dataPath.entry}</p>
              </div>
            </div>

            <ol className="space-y-3">
              {steps.map((step, index) => {
                const active = index === activeIndex;
                return (
                  <li key={`${step.file}-${index}`} className="relative flex items-start gap-3">
                    <span
                      className={cn(
                        "relative z-10 grid size-7 shrink-0 place-items-center rounded-full border font-mono text-[0.625rem] font-semibold transition-colors",
                        active
                          ? "border-primary bg-primary text-primary-foreground shadow-[0_0_18px_rgba(91,224,0,0.45)]"
                          : index < activeIndex
                            ? "border-primary/50 bg-[#102116] text-primary"
                            : "border-border bg-[#0e141b] text-muted-foreground",
                      )}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>

                    <div
                      className={cn(
                        "min-w-0 flex-1 overflow-hidden rounded-xl border transition-colors",
                        active
                          ? "border-primary/50 bg-[#0f1a12] shadow-[0_0_26px_rgba(91,224,0,0.08)]"
                          : "border-border bg-[#0e141b] hover:border-[#3a4b61]",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => setActiveIndex(index)}
                        aria-expanded={active}
                        aria-controls={`data-path-hop-${index}`}
                        className="block w-full px-3.5 py-2.5 text-left outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring"
                      >
                        <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm font-semibold text-foreground">
                          <span>{step.from}</span>
                          <ArrowRight className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
                          <span>{step.to}</span>
                        </span>
                        <span className="mt-1.5 flex items-center gap-1.5 font-mono text-[0.6875rem] text-[#a9bccb]">
                          <FileCode2 className="size-3 shrink-0 text-primary" aria-hidden="true" />
                          <span className="truncate">{step.file}</span>
                        </span>
                      </button>

                      {active ? (
                        <div
                          id={`data-path-hop-${index}`}
                          className="border-t border-primary/20 px-3.5 py-3"
                        >
                          <p className="text-sm leading-relaxed text-[#c2dfcd]">
                            <InlineText text={step.whatHappens} />
                          </p>
                          <a
                            href={fileUrl(repoUrl, step.file)}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2.5 inline-flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-foreground"
                          >
                            Open this hop on GitHub
                            <ExternalLink className="size-3" aria-hidden="true" />
                          </a>
                        </div>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>

            <div className="relative flex items-start gap-3">
              <span className="relative z-10 grid size-7 shrink-0 place-items-center rounded-md border border-[#5a1c1c] bg-[#2c0f0f] text-[#ff7a70]">
                <Bug className="size-3.5" aria-hidden="true" />
              </span>
              <div className="min-w-0 pt-0.5">
                <p className="font-mono text-[0.625rem] tracking-[0.12em] text-[#ff7a70] uppercase">
                  Break
                </p>
                <p className="mt-0.5 flex items-start gap-1.5 text-sm leading-relaxed text-foreground">
                  <CornerDownRight className="mt-0.5 size-3.5 shrink-0 text-[#ff7a70]" aria-hidden="true" />
                  <span>{dataPath.breaksAt}</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {activeStep ? (
          <p className="mt-4 pl-10 font-mono text-[0.6875rem] text-muted-foreground" aria-live="polite">
            Hop {activeIndex + 1} of {steps.length} · {activeStep.from} → {activeStep.to}
          </p>
        ) : null}
      </div>
    </section>
  );
}

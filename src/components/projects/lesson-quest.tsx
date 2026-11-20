"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Check, Circle, MapPin, Route, Sparkles } from "lucide-react";
import type { LessonDoc } from "@/lib/domain/lesson";
import { cn } from "@/lib/utils";

const MonacoTour = dynamic(() => import("./monaco-tour"), {
  ssr: false,
  loading: () => (
    <div className="grid h-72 place-items-center rounded-xl border border-border bg-[#0e141b] text-xs text-muted-foreground">
      Loading the guided code view...
    </div>
  ),
});

export function LessonQuest({
  lesson,
  codeRefs,
  repoUrl,
}: {
  lesson: LessonDoc;
  codeRefs: Array<{ file: string; content: string; note: string }>;
  repoUrl: string;
}) {
  const [step, setStep] = useState(0);
  const [complete, setComplete] = useState<number[]>([]);

  const steps = [
    { title: "Spot the mission", Icon: Sparkles },
    { title: "Trace the code", Icon: Route },
    { title: "Find the evidence", Icon: MapPin },
  ];

  const markComplete = (index: number) => {
    setComplete((items) => (items.includes(index) ? items : [...items, index]));
  };

  return (
    <section className="mt-8" aria-label="Interactive lesson">
      <div className="grid gap-2 sm:grid-cols-3">
        {steps.map(({ title, Icon }, index) => (
          <button
            key={title}
            type="button"
            onClick={() => setStep(index)}
            className={cn(
              "flex min-h-16 items-center gap-3 rounded-xl border p-3 text-left transition-colors",
              step === index
                ? "border-primary/60 bg-[#102116]"
                : "border-border bg-card hover:border-input",
            )}
            aria-pressed={step === index}
          >
            <span className={cn(
              "grid size-8 shrink-0 place-items-center rounded-lg border",
              complete.includes(index)
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-[#0e141b] text-muted-foreground",
            )}>
              {complete.includes(index) ? <Check className="size-4" /> : <Icon className="size-4" />}
            </span>
            <span>
              <span className="font-mono text-[0.625rem] text-muted-foreground">STEP {index + 1}</span>
              <span className="block mt-0.5 text-sm font-semibold">{title}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-card p-5 sm:p-6">
        {step === 0 ? (
          <div>
            <p className="label-mono">Mission objective</p>
            <h2 className="mt-2 text-xl">{lesson.goal}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              After this mission, explain it in one sentence using a real file in the repository.
            </p>
            <button
              type="button"
              onClick={() => {
                markComplete(0);
                setStep(1);
              }}
              className="mt-5 h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"
            >
              Begin trace
            </button>
          </div>
        ) : null}

        {step === 1 ? (
          <div>
            <p className="label-mono">Follow the highlighted code</p>
            {codeRefs.length > 0 ? (
              <MonacoTour codeRefs={codeRefs} repoUrl={repoUrl} />
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">No code reference is available for this step.</p>
            )}
            <button
              type="button"
              onClick={() => {
                markComplete(1);
                setStep(2);
              }}
              className="mt-5 h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"
            >
              Find the evidence
            </button>
          </div>
        ) : null}

        {step === 2 ? (
          <div>
            <p className="label-mono">Evidence check</p>
            <h2 className="mt-2 text-lg">Which file owns the behavior you just traced?</h2>
            <div className="mt-4 grid gap-2">
              {codeRefs.map((ref) => (
                <button
                  key={ref.file}
                  type="button"
                  onClick={() => markComplete(2)}
                  className="flex min-h-12 items-center gap-3 rounded-xl border border-border bg-[#0e141b] px-3 text-left text-sm hover:border-primary/50"
                >
                  {complete.includes(2) ? <Check className="size-4 text-primary" /> : <Circle className="size-4 text-muted-foreground" />}
                  <span className="min-w-0">
                    <span className="block truncate font-mono text-xs text-[#a9bccb]">{ref.file}</span>
                    <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{ref.note}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

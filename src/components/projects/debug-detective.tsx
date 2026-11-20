"use client";

import { useState } from "react";
import { Check, FileCode2, Search, ShieldCheck } from "lucide-react";
import type { LikelyCause } from "@/lib/domain/debug";
import { cn } from "@/lib/utils";

export function DebugDetective({
  symptom,
  causes,
}: {
  symptom: string;
  causes: LikelyCause[];
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [evidenceOpen, setEvidenceOpen] = useState<number[]>([]);

  return (
    <section className="mt-8 rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-[#584211] bg-[#2b1f06] text-[#ffc53d]">
          <Search className="size-5" aria-hidden="true" />
        </span>
        <div>
          <p className="label-mono">Detective board</p>
          <h2 className="mt-1 text-lg">Rank the suspects</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Symptom: <span className="font-mono text-foreground">&ldquo;{symptom}&rdquo;</span>
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        {causes.map((cause, index) => (
          <button
            key={`${cause.cause}-${index}`}
            type="button"
            onClick={() => setSelected(index)}
            className={cn(
              "rounded-xl border p-4 text-left transition-colors",
              selected === index ? "border-primary/60 bg-[#102116]" : "border-border bg-[#0e141b] hover:border-input",
            )}
            aria-pressed={selected === index}
          >
            <div className="flex items-start justify-between gap-3">
              <span className="text-sm font-semibold">Suspect #{index + 1}</span>
              <span className={cn(
                "rounded-md border px-2 py-0.5 font-mono text-[0.625rem] uppercase",
                cause.confidence === "high"
                  ? "border-[#1e5033] text-primary"
                  : cause.confidence === "medium"
                    ? "border-[#584211] text-[#ffc53d]"
                    : "border-border text-muted-foreground",
              )}>
                {cause.confidence}
              </span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{cause.cause}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {cause.evidenceFiles.map((file, fileIndex) => (
                <button
                  key={file}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setEvidenceOpen((items) =>
                      items.includes(fileIndex) ? items : [...items, fileIndex],
                    );
                  }}
                  className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 font-mono text-[0.625rem] text-[#a9bccb]"
                >
                  <FileCode2 className="size-3" aria-hidden="true" />
                  {file}
                </button>
              ))}
            </div>
          </button>
        ))}
      </div>

      {selected !== null ? (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-[#1e5033] bg-[#0e2a1c]/50 p-4">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold">Your prime suspect</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Compare its evidence with the real code below before choosing the fix.
            </p>
            {evidenceOpen.length === causes[selected]?.evidenceFiles.length ? (
              <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                <Check className="size-3" aria-hidden="true" />
                Evidence reviewed
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

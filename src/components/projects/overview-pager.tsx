"use client";

import {
  Children,
  isValidElement,
  useState,
  type ReactNode,
} from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

export function OverviewPager({
  labels,
  children,
}: {
  labels: string[];
  children: ReactNode;
}) {
  const slides = Children.toArray(children).filter(isValidElement);
  const [active, setActive] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  function goTo(index: number) {
    const next = Math.max(0, Math.min(slides.length - 1, index));
    setActive(next);
  }

  return (
    <section className="mt-8" aria-label="Architecture map sections">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex max-w-full items-center gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1">
          {labels.map((label, index) => (
            <button
              key={label}
              type="button"
              onClick={() => goTo(index)}
              className={
                active === index
                  ? "h-8 shrink-0 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground"
                  : "h-8 shrink-0 rounded-lg px-3 text-xs font-medium text-muted-foreground hover:text-foreground"
              }
              aria-current={active === index ? "step" : undefined}
            >
              {index + 1}. {label}
            </button>
          ))}
        </div>
        <span className="font-mono text-xs text-muted-foreground">
          {active + 1} / {slides.length}
        </span>
      </div>

      <div
        className="touch-pan-y rounded-2xl"
        onTouchStart={(event) => setTouchStart(event.touches[0]?.clientX ?? null)}
        onTouchEnd={(event) => {
          if (touchStart === null) return;
          const end = event.changedTouches[0]?.clientX;
          if (end === undefined) return;
          const distance = end - touchStart;
          if (Math.abs(distance) > 48) {
            goTo(active + (distance < 0 ? 1 : -1));
          }
          setTouchStart(null);
        }}
      >
        <div key={active} className="w-full animate-rise">
          {slides[active]}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => goTo(active - 1)}
          disabled={active === 0}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-border px-4 text-sm font-semibold disabled:opacity-40"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back
        </button>
        <div className="flex gap-1.5" aria-label="Map section position">
          {labels.map((label, index) => (
            <button
              key={label}
              type="button"
              onClick={() => goTo(index)}
              className={active === index ? "size-2 rounded-full bg-primary" : "size-2 rounded-full bg-border"}
              aria-label={`Go to ${label}`}
              aria-current={active === index ? "step" : undefined}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => goTo(active + 1)}
          disabled={active === slides.length - 1}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-40"
        >
          Next
          <ArrowRight className="size-4" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}

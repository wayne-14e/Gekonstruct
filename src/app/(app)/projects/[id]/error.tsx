"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, RotateCcw } from "lucide-react";
import { GekoAvatar } from "@/components/brand/geko-avatar";
import { Button } from "@/components/ui/button";

/**
 * Segment error boundary for a project. It keeps the dashboard one click away, so a broken
 * project route never strands the learner with no exit.
 */
export default function ProjectError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Project route error", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-3xl items-center px-4 py-16 sm:px-6">
      <div className="w-full rounded-2xl border border-border bg-card p-6 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-10">
        <div className="flex justify-center">
          <GekoAvatar mood="calm" size="md" />
        </div>
        <p className="label-mono mt-5">This project hit a snag</p>
        <h1 className="mt-2 text-2xl">Geko lost the trail</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
          Nothing you learned was lost. Retry the page, or head back to the dashboard and open
          the project again.
        </p>
        <div className="mx-auto mt-4 flex max-w-md items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-left text-xs text-[#ffb0a8]">
          <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
          <p className="min-w-0 break-words">
            {process.env.NODE_ENV === "production"
              ? "The page could not render."
              : error.message || "Unknown error"}
            {error.digest ? ` · ref ${error.digest}` : ""}
          </p>
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button size="lg" onClick={reset}>
            <RotateCcw aria-hidden="true" />
            Try again
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/dashboard">
              <ArrowLeft aria-hidden="true" />
              Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

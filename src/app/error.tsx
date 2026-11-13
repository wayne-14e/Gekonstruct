"use client";

import { useEffect } from "react";
import { RotateCcw } from "lucide-react";
import { GekoMark } from "@/components/brand/geko-mark";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Route error", error);
  }, [error]);

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-16">
      <div className="max-w-md text-center">
        <GekoMark className="mx-auto size-16 text-primary" />
        <h1 className="mt-6 text-3xl font-semibold">Something broke on our side</h1>
        <p className="mt-3 text-muted-foreground">
          Geko dropped a branch. Your data is fine — try that again, and if it keeps
          happening the reference below helps us find it.
        </p>
        {error.digest ? (
          <p className="mt-4 font-mono text-xs text-muted-foreground">ref: {error.digest}</p>
        ) : null}
        <div className="mt-6 flex justify-center">
          <Button size="lg" onClick={reset}>
            <RotateCcw aria-hidden="true" />
            Try again
          </Button>
        </div>
      </div>
    </div>
  );
}

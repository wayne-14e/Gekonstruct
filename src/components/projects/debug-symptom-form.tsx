"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Bug, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DEBUG_LIMITS } from "@/lib/domain/debug";

const EXAMPLE_SYMPTOMS = [
  "Session cookie or auth token is not persisting across page reloads",
  "TypeError: Cannot read properties of undefined in route handler",
  "Database query times out or fails under concurrent requests",
  "Client state and server rendered props get out of sync",
];

export function DebugSymptomForm({
  projectId,
  remainingSessions,
}: {
  projectId: string;
  remainingSessions: number;
}) {
  const router = useRouter();
  const [symptom, setSymptom] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = symptom.trim();
  const isValidLength =
    trimmed.length >= DEBUG_LIMITS.symptomMinChars &&
    trimmed.length <= DEBUG_LIMITS.symptomMaxChars;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isValidLength || loading) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/debug/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, symptom: trimmed }),
      });

      const data = (await response.json()) as { ok: boolean; sessionId?: string; error?: string };

      if (!response.ok || !data.ok || !data.sessionId) {
        setError(data.error ?? "Failed to analyze bug. Check your connection and try again.");
        if (response.status === 429 || data.sessionId) router.refresh();
        setLoading(false);
        return;
      }

      router.push(`/projects/${projectId}/debug/${data.sessionId}`);
    } catch {
      setError("Network error while starting the debug session. Please try again.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <Bug className="size-5 text-primary" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-foreground">Describe what&apos;s breaking</h2>
      </div>

      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        Paste an error message, stack trace, or describe what goes wrong. Gekonstruct will
        search your codebase, find evidence in your real files, and explain how to fix it.
      </p>
      <p className="mt-2 font-mono text-xs text-muted-foreground">
        {remainingSessions} of {DEBUG_LIMITS.freeSessionsPerProject} free debug sessions remaining
        for this project.
      </p>

      <div className="mt-4">
        <label htmlFor="symptom-input" className="sr-only">
          Symptom description
        </label>
        <textarea
          id="symptom-input"
          value={symptom}
          onChange={(e) => {
            setSymptom(e.target.value);
            if (error) setError(null);
          }}
          placeholder="e.g. When calling the payment webhook, the route handler returns a 500 error because the signature verification fails in src/lib/stripe.ts..."
          disabled={loading}
          rows={4}
          className="w-full rounded-xl border border-border bg-[#0e141b] p-3.5 font-mono text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
        />
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>Min {DEBUG_LIMITS.symptomMinChars} characters</span>
          <span className={trimmed.length > DEBUG_LIMITS.symptomMaxChars ? "text-[#ff7a70]" : ""}>
            {trimmed.length}/{DEBUG_LIMITS.symptomMaxChars}
          </span>
        </div>
      </div>

      <div className="mt-4">
        <p className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
          <Sparkles className="size-3.5 text-primary" aria-hidden="true" />
          Example symptoms to try:
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {EXAMPLE_SYMPTOMS.map((ex) => (
            <button
              key={ex}
              type="button"
              disabled={loading}
              onClick={() => {
                setSymptom(ex);
                if (error) setError(null);
              }}
              className="rounded-lg border border-border/80 bg-[#0e141b] px-2.5 py-1 text-left text-xs text-[#a9bccb] transition-colors hover:border-input hover:text-foreground disabled:opacity-50"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#5a1c1c] bg-[#2c0f0f] p-3 text-sm text-[#ff7a70]">
          <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
          <p>{error}</p>
        </div>
      ) : null}

      <div className="mt-5 flex justify-end">
        <Button type="submit" disabled={!isValidLength || loading} size="lg" className="gap-2">
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Hunting bug in codebase...
            </>
          ) : (
            <>
              <Bug className="size-4" aria-hidden="true" />
              Find & Explain the Bug
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

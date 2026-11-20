"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Clock3 } from "lucide-react";

type Commit = {
  sha: string;
  message: string;
  author: string;
  date: string;
  htmlUrl: string;
  files: Array<{ filename: string; status: string; additions: number; deletions: number }>;
};

export function GitTimeTravel({ projectId }: { projectId: string }) {
  const [commits, setCommits] = useState<Commit[]>([]);
  const [index, setIndex] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/projects/${projectId}/history`)
      .then(async (response) => {
        if (!response.ok) throw new Error("History could not be loaded");
        return await response.json() as { commits: Commit[] };
      })
      .then((data) => {
        if (!cancelled) setCommits(data.commits);
      })
      .catch(() => {
        if (!cancelled) setError("Commit history is unavailable for this repository.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  if (loading) {
    return (
      <div className="mt-4 h-40 animate-pulse rounded-2xl border border-border bg-card" />
    );
  }

  if (error) {
    return (
      <div className="mt-4 rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
        {error}
      </div>
    );
  }

  const commit = commits[index];
  if (!commit) return null;

  return (
    <section className="mt-8 rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label-mono">Git time-travel</p>
          <h2 className="mt-1 text-lg">Why does this code exist?</h2>
        </div>
        <span className="font-mono text-xs text-muted-foreground">
          {index + 1}/{commits.length}
        </span>
      </div>

      <div className="mt-4 rounded-xl border border-border bg-[#0e141b] p-4">
        <div className="flex items-center gap-2 text-sm">
          <Clock3 className="size-4 text-primary" aria-hidden="true" />
          <span className="font-semibold">{commit.message}</span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {commit.author} · {new Date(commit.date).toLocaleDateString()} · <a className="text-primary" href={commit.htmlUrl} target="_blank" rel="noreferrer">{commit.sha.slice(0, 7)}</a>
        </p>
        <div className="mt-4 space-y-2">
          {commit.files.slice(0, 8).map((file) => (
            <div key={file.filename} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 font-mono text-xs">
              <span className="min-w-0 truncate text-[#a9bccb]">{file.filename}</span>
              <span className="shrink-0 text-[0.625rem] text-muted-foreground">
                <span className="text-primary">+{file.additions}</span>{" "}
                <span className="text-destructive">-{file.deletions}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex justify-between">
        <button
          type="button"
          onClick={() => setIndex((value) => Math.max(0, value - 1))}
          disabled={index === 0}
          className="inline-flex h-9 items-center gap-1 rounded-lg border border-border px-3 text-sm disabled:opacity-40"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Earlier
        </button>
        <button
          type="button"
          onClick={() => setIndex((value) => Math.min(commits.length - 1, value + 1))}
          disabled={index === commits.length - 1}
          className="inline-flex h-9 items-center gap-1 rounded-lg border border-border px-3 text-sm disabled:opacity-40"
        >
          Later
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}

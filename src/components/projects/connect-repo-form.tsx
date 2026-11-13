"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FolderGit2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createProject } from "@/app/actions/projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MAX_PROJECTS } from "@/lib/domain/project";

export function ConnectRepoForm({ atLimit, remaining }: { atLimit: boolean; remaining: number }) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (atLimit || pending) return;

    setError(null);
    startTransition(async () => {
      const result = await createProject(url);
      if (!result.ok) {
        setError(result.error);
        toast.error(result.error);
        return;
      }

      setUrl("");
      toast.success("Repository connected. Reading the tree…");
      router.push(`/projects/${result.projectId}`);
      router.refresh();
    });
  }

  return (
    <div>
      <label htmlFor="repo-url" className="label-mono">
        Public repository URL
      </label>

      <form onSubmit={handleSubmit} className="mt-2 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <FolderGit2
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="repo-url"
            name="repo-url"
            type="text"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            placeholder="https://github.com/owner/repo"
            className="pl-9 font-mono text-sm"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            disabled={atLimit || pending}
            aria-invalid={Boolean(error)}
            aria-describedby="repo-url-help"
          />
        </div>

        <Button type="submit" size="lg" disabled={atLimit || pending || url.trim().length === 0}>
          {pending ? (
            <>
              <Loader2 className="animate-spin" aria-hidden="true" />
              Connecting…
            </>
          ) : (
            "Connect repo"
          )}
        </Button>
      </form>

      <p
        id="repo-url-help"
        className="mt-2 font-mono text-[0.6875rem] leading-relaxed tracking-[0.08em] text-muted-foreground uppercase"
      >
        {atLimit
          ? `Limit reached · ${MAX_PROJECTS} of ${MAX_PROJECTS} projects connected`
          : `Public repos only · read-only · ${remaining} of ${MAX_PROJECTS} slots open`}
      </p>

      {error ? (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

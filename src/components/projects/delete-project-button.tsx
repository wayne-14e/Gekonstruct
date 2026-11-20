"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteProjectAction } from "@/app/actions/projects";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function DeleteProjectButton({
  projectId,
  projectTitle,
}: {
  projectId: string;
  projectTitle: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function deleteProject() {
    setError(null);
    startTransition(async () => {
      const result = await deleteProjectAction(projectId);
      if (!result.ok) {
        setError(result.error);
        return;
      }

      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!pending) {
          setOpen(nextOpen);
          if (!nextOpen) setError(null);
        }
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={pending}
        className="grid size-9 shrink-0 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:border-destructive/60 hover:bg-destructive/10 hover:text-destructive focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        aria-label={`Delete ${projectTitle}`}
      >
        <Trash2 className="size-4" aria-hidden="true" />
      </button>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {projectTitle}?</DialogTitle>
          <DialogDescription>
            This permanently deletes the project and all of its snapshot, guidebook, lesson,
            progress, debug and analytics data. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={pending}
            onClick={deleteProject}
          >
            {pending ? "Deleting…" : "Delete project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

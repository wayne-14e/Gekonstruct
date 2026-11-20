"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LogOut, RotateCcw, Save, Trash2 } from "lucide-react";
import { clearUserProgressAction, updateDisplayNameAction } from "@/app/actions/profile";
import { signOutAction } from "@/app/actions/auth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ProfileActions({ initialDisplayName }: { initialDisplayName: string }) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [savedDisplayName, setSavedDisplayName] = useState(initialDisplayName);
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function saveName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const result = await updateDisplayNameAction(displayName);
      if (!result.ok) {
        setMessage({ error: true, text: result.error });
        return;
      }

      setDisplayName(displayName.trim());
      setSavedDisplayName(displayName.trim());
      setMessage({ error: false, text: "Your name has been saved." });
      router.refresh();
    });
  }

  return (
    <section
      aria-labelledby="edit-name-heading"
      className="rounded-2xl border border-border bg-card p-5 sm:p-6"
    >
      <div>
        <p className="label-mono">Profile</p>
        <h2 id="edit-name-heading" className="mt-2 text-xl">
          Your name
        </h2>
      </div>
      <form onSubmit={saveName} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <label htmlFor="display-name" className="mb-1.5 block text-sm font-medium">
            Name
          </label>
          <Input
            id="display-name"
            name="displayName"
            autoComplete="name"
            maxLength={60}
            required
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
          />
        </div>
        <Button
          type="submit"
          variant="secondary"
          disabled={pending || !displayName.trim() || displayName.trim() === savedDisplayName}
        >
          <Save aria-hidden="true" />
          {pending ? "Saving…" : "Save name"}
        </Button>
      </form>
      <p className="mt-2 text-xs text-muted-foreground">Use 1–60 characters.</p>
      {message ? (
        <p
          className={`mt-4 text-sm ${message.error ? "text-destructive" : "text-primary"}`}
          role={message.error ? "alert" : "status"}
        >
          {message.text}
        </p>
      ) : null}
    </section>
  );
}

export function AccountActions() {
  const router = useRouter();
  const [confirmation, setConfirmation] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function clearProgress() {
    setDialogError(null);
    startTransition(async () => {
      const result = await clearUserProgressAction(confirmation);
      if (!result.ok) {
        setDialogError(result.error);
        return;
      }

      setConfirmation("");
      setDialogOpen(false);
      setMessage({ error: false, text: "Your projects, progress, XP, and badges have been erased." });
      router.refresh();
    });
  }

  function signOut() {
    setMessage(null);
    startTransition(async () => {
      try {
        await signOutAction();
        router.push("/");
        router.refresh();
      } catch {
        setMessage({ error: true, text: "We couldn't sign you out. Please try again." });
      }
    });
  }

  return (
    <section
      aria-labelledby="account-actions-heading"
      className="rounded-2xl border border-[#65302d] bg-[#211413] p-5 sm:p-6"
    >
      <p className="label-mono text-destructive">Account</p>
      <h2 id="account-actions-heading" className="mt-2 text-xl">
        Account actions
      </h2>
      <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        Erasing progress permanently removes every project, its saved work, your badges, and
        XP. Your sign-in account and profile name will remain.
      </p>

      <div className="mt-5 flex flex-col gap-3 border-t border-[#65302d]/70 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-lg">
          <p className="text-sm font-semibold">Start over</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            This cannot be undone. You can connect projects again after the reset.
          </p>
        </div>
        <Button
          type="button"
          variant="destructive"
          onClick={() => {
            setDialogError(null);
            setDialogOpen(true);
          }}
          disabled={pending}
        >
          <Trash2 aria-hidden="true" />
          Erase all progress
        </Button>
      </div>

      <div className="mt-5 flex flex-col gap-3 border-t border-[#65302d]/70 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-lg">
          <p className="text-sm font-semibold">Leave Gekonstruct</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Your saved projects and progress will stay in your account.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={signOut} disabled={pending}>
          <LogOut aria-hidden="true" />
          {pending ? "Please wait…" : "Sign out"}
        </Button>
      </div>
      {message ? (
        <p
          className={`mt-4 text-sm ${message.error ? "text-destructive" : "text-primary"}`}
          role={message.error ? "alert" : "status"}
        >
          {message.text}
        </p>
      ) : null}

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!pending) {
            setDialogOpen(open);
            if (!open) {
              setConfirmation("");
              setDialogError(null);
            }
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Erase all progress and projects?</DialogTitle>
            <DialogDescription>
              This permanently deletes every project and all nested project data, then resets
              your XP and badges. Your account and profile name will remain. This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label htmlFor="erase-confirmation" className="text-sm font-medium">
              Type DELETE to confirm
            </label>
            <Input
              id="erase-confirmation"
              autoComplete="off"
              value={confirmation}
              onChange={(event) => {
                setConfirmation(event.target.value);
                setDialogError(null);
              }}
            />
          </div>
          {dialogError ? (
            <p className="text-sm text-destructive" role="alert">
              {dialogError}
            </p>
          ) : null}
          <DialogFooter className="sm:mx-0 sm:mb-0 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0">
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => {
                setDialogOpen(false);
                setConfirmation("");
                setDialogError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={pending || confirmation !== "DELETE"}
              onClick={clearProgress}
            >
              <RotateCcw aria-hidden="true" />
              {pending ? "Erasing…" : "Erase everything"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

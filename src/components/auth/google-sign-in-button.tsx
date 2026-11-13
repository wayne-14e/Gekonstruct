"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/firebase/client";
import { signInAction } from "@/app/actions/auth";
import { cn } from "@/lib/utils";
import { safeNextPath } from "@/lib/nav";

export function GoogleSignInButton({
  next,
  className,
  size = "lg",
  label = "Continue with Google",
}: {
  next?: string;
  className?: string;
  size?: "default" | "lg" | "sm";
  label?: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "working">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    setStatus("working");
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const credential = await signInWithPopup(auth, provider);
      const idToken = await credential.user.getIdToken();

      const result = await signInAction({ idToken });
      if (!result.ok) {
        await signOut(auth).catch(() => undefined);
        setError(result.error);
        setStatus("idle");
        return;
      }

      router.replace(safeNextPath(next));
      router.refresh();
    } catch (caught) {
      const code = errorCode(caught);
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
        setStatus("idle");
        return;
      }
      setError(messageForCode(code));
      setStatus("idle");
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      <Button
        type="button"
        size={size}
        className="w-full"
        onClick={handleClick}
        disabled={status === "working"}
        aria-busy={status === "working"}
      >
        {status === "working" ? (
          <>
            <Loader2 className="animate-spin" aria-hidden="true" />
            Signing you in…
          </>
        ) : (
          label
        )}
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function errorCode(caught: unknown): string {
  if (typeof caught === "object" && caught !== null && "code" in caught) {
    return String((caught as { code: unknown }).code);
  }
  return "unknown";
}

function messageForCode(code: string): string {
  switch (code) {
    case "auth/popup-blocked":
      return "Your browser blocked the sign-in window. Allow pop-ups for this site, then try again.";
    case "auth/unauthorized-domain":
      return "This domain is not authorised for Google sign-in yet. Add it in Firebase Auth → Settings → Authorized domains.";
    case "auth/network-request-failed":
      return "Network hiccup. Check your connection and try again.";
    case "auth/operation-not-allowed":
      return "Google sign-in is not enabled for this project yet.";
    default:
      return "Sign-in did not go through. Please try again.";
  }
}

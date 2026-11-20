"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  buildProgressShareText,
  createProgressShareImage,
} from "@/lib/share-progress";

type ShareProgressButtonProps = {
  displayName: string;
  totalXp: number;
  badges: readonly string[];
};

export function ShareProgressButton({
  displayName,
  totalXp,
  badges,
}: ShareProgressButtonProps) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);

  function downloadImage(file: File) {
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
  }

  function isShareCancelled(error: unknown) {
    return error instanceof DOMException && error.name === "AbortError";
  }

  async function shareProgress() {
    setPending(true);
    setMessage(null);
    const text = buildProgressShareText({ displayName, totalXp, badges });
    let imageDownloaded = false;

    try {
      const image = createProgressShareImage({ displayName, totalXp, badges });
      if (
        typeof navigator.share === "function" &&
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [image] })
      ) {
        try {
          await navigator.share({
            title: "My Gekonstruct progress",
            text,
            files: [image],
          });
          setMessage({ error: false, text: "Your image and caption are ready in the share sheet." });
          return;
        } catch (error) {
          if (isShareCancelled(error)) return;
          console.error("image share failed", error);
        }
      }

      downloadImage(image);
      imageDownloaded = true;

      if (typeof navigator.share === "function") {
        try {
          await navigator.share({ title: "My Gekonstruct progress", text });
          setMessage({
            error: false,
            text: "The image card was downloaded; the share sheet opened with your caption.",
          });
          return;
        } catch (error) {
          if (isShareCancelled(error)) {
            setMessage({
              error: false,
              text: "The image card was downloaded. Add it to your post when you're ready.",
            });
            return;
          }
          console.error("text share failed", error);
        }
      }

      await navigator.clipboard.writeText(text);
      setMessage({
        error: false,
        text: "The image card was downloaded and its caption copied for your post.",
      });
    } catch (error) {
      console.error("share progress failed", error);
      setMessage({
        error: true,
        text: imageDownloaded
          ? "The image card was downloaded, but its caption could not be copied."
          : "Could not create or share your progress card. Check browser permissions and try again.",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <section
      aria-labelledby="share-progress-heading"
      className="rounded-2xl border border-border bg-card p-5 sm:p-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-2xl">
          <p className="label-mono">Achievement</p>
          <h2 id="share-progress-heading" className="mt-2 text-xl font-semibold text-foreground">
            Show what you&apos;ve learned
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Share a branded image with your name, XP, badges, and the gekonstruct.dev link.
            Your browser may download it separately if the share sheet can&apos;t attach images.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={shareProgress}
          disabled={pending}
          className="sm:shrink-0"
        >
          <Share2 aria-hidden="true" />
          {pending ? "Preparing…" : "Share progress"}
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
    </section>
  );
}

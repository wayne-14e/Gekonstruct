"use client";

import { useState, useTransition } from "react";
import { Flame, Share2 } from "lucide-react";
import { roastProjectAction } from "@/app/actions/projects";
import { Button } from "@/components/ui/button";
import { buildRoastShareText, createRoastShareImage } from "@/lib/share-roast";
import type { CompletedRepoRoast } from "@/lib/domain/repo-roast";

type RepoRoastProps = {
  projectId: string;
  projectTitle: string;
  repoUrl: string;
  hasSnapshot: boolean;
  initialRoast: Pick<CompletedRepoRoast, "quote" | "file"> | null;
};

export function RepoRoast({
  projectId,
  projectTitle,
  repoUrl,
  hasSnapshot,
  initialRoast,
}: RepoRoastProps) {
  const [roast, setRoast] = useState(initialRoast);
  const [pending, startTransition] = useTransition();
  const [sharing, setSharing] = useState(false);
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);

  function roastProject() {
    setMessage(null);
    startTransition(async () => {
      const result = await roastProjectAction(projectId);
      if (!result.ok) {
        setMessage({ error: true, text: result.error });
        return;
      }
      setRoast({ quote: result.quote, file: result.file });
    });
  }

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

  async function shareRoast() {
    if (!roast) return;
    setSharing(true);
    setMessage(null);
    const text = buildRoastShareText({
      projectTitle,
      quote: roast.quote,
      file: roast.file,
      repoUrl,
    });
    let imageDownloaded = false;
    let nativeShareFailed = false;

    try {
      const image = await createRoastShareImage({
        projectTitle,
        quote: roast.quote,
        file: roast.file,
      });
      if (
        typeof navigator.share === "function" &&
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [image] })
      ) {
        try {
          await navigator.share({
            title: `Geko roasted ${projectTitle}`,
            text,
            files: [image],
          });
          setMessage({ error: false, text: "Your roast image and caption are ready in the share sheet." });
          return;
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") return;
          nativeShareFailed = true;
        }
      }

      downloadImage(image);
      imageDownloaded = true;
      if (!nativeShareFailed && typeof navigator.share === "function") {
        try {
          await navigator.share({ title: `Geko roasted ${projectTitle}`, text });
          setMessage({ error: false, text: "The roast image downloaded and the share sheet opened." });
          return;
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") {
            setMessage({ error: false, text: "The roast image downloaded. Add it to your post." });
            return;
          }
        }
      }

      await navigator.clipboard.writeText(text);
      setMessage({ error: false, text: "The roast image downloaded and its caption was copied." });
    } catch {
      setMessage({
        error: true,
        text: imageDownloaded
          ? "The roast image downloaded, but its caption could not be copied."
          : "Could not create or share the roast. Check browser permissions and try again.",
      });
    } finally {
      setSharing(false);
    }
  }

  return (
    <section
      aria-labelledby="repo-roast-heading"
      className="rounded-2xl border border-[#584211] bg-[#2b1f06] p-5"
    >
      <div className="flex items-center gap-2">
        <Flame className="size-4 text-[#ffc53d]" aria-hidden="true" />
        <p id="repo-roast-heading" className="label-mono text-[#ffc53d]">
          Repo Roast
        </p>
      </div>

      {roast ? (
        <blockquote className="mt-3 text-base font-semibold leading-relaxed text-[#ffd57a]">
          “{roast.quote}”
        </blockquote>
      ) : (
        <p className="mt-3 text-sm leading-relaxed text-[#d8b96d]">
          Let Geko spot one suspicious pattern in your repository. One roast per project.
        </p>
      )}
      {roast ? (
        <p className="mt-2 text-xs text-[#d8b96d]">
          This project gets one roast. Save or share the one Geko found.
        </p>
      ) : null}

      {roast ? (
        <a
          href={`${repoUrl.replace(/\/$/, "")}/blob/HEAD/${roast.file}`}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex max-w-full rounded-md border border-[#584211] bg-[#1d1809] px-2 py-1 font-mono text-xs text-[#ffd57a] transition-colors hover:border-[#ffc53d]"
        >
          <span className="truncate">{roast.file}</span>
        </a>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={roastProject}
          disabled={pending || !hasSnapshot || roast !== null}
          className="border-[#584211] bg-[#ffc53d] text-[#211707] shadow-[0_3px_0_#8a6512] hover:bg-[#ffd77a] hover:brightness-100"
        >
          <Flame aria-hidden="true" />
          {pending ? "Geko is judging…" : roast ? "Roast used" : "Roast my project"}
        </Button>
        {roast ? (
          <Button
            type="button"
            variant="outline"
            onClick={shareRoast}
            disabled={sharing}
            className="border-[#584211] text-[#ffd57a] hover:border-[#ffc53d] hover:bg-[#3a2b0c]"
          >
            <Share2 aria-hidden="true" />
            {sharing ? "Preparing…" : "Share roast"}
          </Button>
        ) : null}
      </div>

      {message ? (
        <p
          className={`mt-3 text-sm ${message.error ? "text-destructive" : "text-[#ffd57a]"}`}
          role={message.error ? "alert" : "status"}
        >
          {message.text}
        </p>
      ) : null}
    </section>
  );
}

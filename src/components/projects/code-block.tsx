import { ExternalLink } from "lucide-react";
import { codeToHtml, type BundledLanguage } from "shiki";
import { fileUrl } from "@/components/projects/guidebook-parts";
import { languageForPath } from "@/lib/code-language";
import { cn } from "@/lib/utils";

const THEME = "github-dark-default";
const MAX_DISPLAY_CHARS = 6_000;

/**
 * Server-rendered code block for lesson `codeRefs` (BLUEPRINT §9). Content comes from the
 * stored snapshot by path; shiki escapes it, and an unknown language falls back to plain
 * text so one exotic file can never break a lesson.
 */
export async function CodeBlock({
  path,
  content,
  repoUrl,
  note,
  open = false,
  className,
}: {
  path: string;
  content: string;
  repoUrl: string;
  note?: string;
  open?: boolean;
  className?: string;
}) {
  const clipped =
    content.length > MAX_DISPLAY_CHARS
      ? `${content.slice(0, MAX_DISPLAY_CHARS)}\n\n// ... [truncated for this lesson — open the file on GitHub for the rest] ...`
      : content;

  const language = languageForPath(path);
  let html: string;
  try {
    html = await codeToHtml(clipped, {
      lang: language as BundledLanguage,
      theme: THEME,
    });
  } catch {
    html = await codeToHtml(clipped, { lang: "text", theme: THEME });
  }

  return (
    <details
      open={open}
      className={cn(
        "group overflow-hidden rounded-xl border border-border bg-[#0e141b]",
        className,
      )}
    >
      <summary className="flex cursor-pointer list-none items-start gap-3 px-4 py-3 outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
        <span className="path-chip mt-0.5 min-w-0 truncate">{path}</span>
        <span className="min-w-0 flex-1 text-xs leading-relaxed text-muted-foreground">
          {note}
        </span>
        <span className="mt-1 shrink-0 font-mono text-[0.625rem] tracking-[0.08em] text-muted-foreground uppercase">
          code
        </span>
      </summary>
      <div className="border-t border-border/70">
        <div className="flex items-center justify-between gap-3 px-4 py-2">
          <span className="font-mono text-[0.625rem] tracking-[0.08em] text-muted-foreground uppercase">
            {language}
          </span>
          <a
            href={fileUrl(repoUrl, path)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-md text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Open on GitHub
            <ExternalLink className="size-3" aria-hidden="true" />
          </a>
        </div>
        <div
          className="max-h-[28rem] overflow-auto text-[0.8125rem] [&_pre]:m-0 [&_pre]:min-w-full [&_pre]:p-4"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </details>
  );
}

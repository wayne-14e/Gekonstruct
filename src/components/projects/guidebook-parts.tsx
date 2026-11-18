import { cn } from "@/lib/utils";

/**
 * Model prose is allowed to contain short inline code (the prompts ask for real paths in
 * backticks). Rendering those as chips-within-a-sentence is what makes the map feel like
 * it points at real files instead of talking in the abstract.
 */
export function InlineText({ text, className }: { text: string; className?: string }) {
  const parts = text.split("`");

  return (
    <span className={className}>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <code
            key={`code-${index}`}
            className="rounded border border-border bg-[#0e141b] px-1 py-px font-mono text-[0.8125em] break-words text-[#a9bccb]"
          >
            {part}
          </code>
        ) : (
          <span key={`text-${index}`}>{part}</span>
        ),
      )}
    </span>
  );
}

/** GitHub link for a snapshot path. `HEAD` resolves to the default branch. */
export function fileUrl(repoUrl: string, path: string): string {
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  return `${repoUrl.replace(/\/+$/, "")}/blob/HEAD/${encoded}`;
}

export function FileChip({
  path,
  repoUrl,
  className,
}: {
  path: string;
  repoUrl: string;
  className?: string;
}) {
  return (
    <a
      href={fileUrl(repoUrl, path)}
      target="_blank"
      rel="noreferrer"
      title={`Open ${path} on GitHub`}
      className={cn(
        "path-chip max-w-full transition-colors hover:border-[#3a4b61] hover:text-foreground",
        className,
      )}
    >
      {path}
    </a>
  );
}

export function FileChipList({
  files,
  repoUrl,
  className,
}: {
  files: string[];
  repoUrl: string;
  className?: string;
}) {
  if (files.length === 0) return null;

  return (
    <ul className={cn("flex flex-wrap gap-1.5", className)}>
      {files.map((path) => (
        <li key={path} className="min-w-0 max-w-full">
          <FileChip path={path} repoUrl={repoUrl} />
        </li>
      ))}
    </ul>
  );
}

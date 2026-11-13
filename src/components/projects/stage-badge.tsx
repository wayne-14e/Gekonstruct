import { cn } from "@/lib/utils";
import { stageLabel, type ProjectStage } from "@/lib/domain/project";

/**
 * Stage pill shared by the dashboard cards and the project header. Failures are the only
 * danger-coloured state; queued work stays quiet so the active stage reads loudest.
 */
export function StageBadge({ stage, className }: { stage: ProjectStage; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center rounded-md border px-2 font-mono text-[0.6875rem] font-medium tracking-[0.06em] uppercase",
        toneFor(stage),
        className,
      )}
    >
      {stageLabel(stage)}
    </span>
  );
}

function toneFor(stage: ProjectStage): string {
  if (stage.startsWith("failed:")) {
    return "border-destructive/30 bg-destructive/12 text-destructive";
  }
  switch (stage) {
    case "ready":
      return "border-[#1e5033] bg-[#0e2a1c] text-[#8ce85f]";
    case "ingested":
      return "border-[#155149] bg-[#0b2b2b] text-[#7ce7d8]";
    case "architecture":
    case "lessons1":
    case "lessons2":
      return "border-[#584211] bg-[#2b1f06] text-[#ffd57a]";
    default:
      return "border-border bg-secondary text-muted-foreground";
  }
}

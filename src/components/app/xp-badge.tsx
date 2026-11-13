import { cn } from "@/lib/utils";

/**
 * XP chip. Monospace numbers so the total reads like a counter, not prose.
 * The skin gradient is the reward signal — used here and on progress bars only.
 */
export function XpBadge({
  totalXp,
  className,
  size = "default",
}: {
  totalXp: number;
  className?: string;
  size?: "sm" | "default";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-card font-medium text-foreground",
        size === "sm" ? "h-6 px-2 text-xs" : "h-8 px-3 text-sm",
        className,
      )}
      aria-label={`${totalXp} experience points`}
    >
      <span className="skin-gradient size-2 rounded-full" aria-hidden="true" />
      <span className="font-mono tabular-nums">{totalXp.toLocaleString()}</span>
      <span className="text-muted-foreground">XP</span>
    </span>
  );
}

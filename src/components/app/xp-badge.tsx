import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * XP chip. Monospace numerals in amber — the reward signal, lifted straight from the
 * gamified-learning vocabulary the product speaks.
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
        "inline-flex items-center gap-1.5 rounded-lg border border-[#584211] bg-[#2b1f06] font-medium text-[#ffc53d]",
        size === "sm" ? "h-7 px-2 text-xs" : "h-9 px-3 text-sm",
        className,
      )}
      aria-label={`${totalXp} experience points`}
    >
      <Zap className="size-3.5 fill-current" aria-hidden="true" />
      <span className="font-mono font-semibold tabular-nums">{totalXp.toLocaleString()}</span>
      <span className="text-[#c9a13c]">XP</span>
    </span>
  );
}

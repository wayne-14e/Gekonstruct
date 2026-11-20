import {
  Award,
  Bug,
  Check,
  GraduationCap,
  Lock,
  Map,
  type LucideIcon,
} from "lucide-react";
import {
  BADGES,
  BADGE_IDS,
  earnedBadgeCount,
  isBadgeId,
  uniqueBadgeList,
  type BadgeId,
} from "@/lib/badges";
import { cn } from "@/lib/utils";

const ICONS: Record<BadgeId, LucideIcon> = {
  "map-reader": Map,
  "foundation-builder": GraduationCap,
  "bug-whisperer": Bug,
};

/**
 * The three MVP badges (BLUEPRINT §7). Earned badges use the amber reward tone; locked
 * ones stay quiet so the shelf never reads as a checklist to grind.
 */
export function BadgeShelf({
  badges,
  compact = false,
  className,
}: {
  badges: readonly string[];
  compact?: boolean;
  className?: string;
}) {
  const list = uniqueBadgeList(badges);
  const earned = earnedBadgeCount(list);

  if (compact) {
    return (
      <ul className={cn("space-y-2", className)}>
        {BADGE_IDS.map((id) => {
          const definition = BADGES[id];
          const Icon = ICONS[id];
          const has = list.includes(id);
          return (
            <li
              key={id}
              className={cn(
                "flex items-start gap-2.5 rounded-lg border px-2.5 py-2",
                has
                  ? "border-[#584211] bg-[#2b1f06]"
                  : "border-border bg-[#0e141b]",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 grid size-6 shrink-0 place-items-center rounded-md border",
                  has
                    ? "border-[#584211] text-[#ffc53d]"
                    : "border-border text-muted-foreground",
                )}
              >
                {has ? (
                  <Icon className="size-3.5" aria-hidden="true" />
                ) : (
                  <Lock className="size-3" aria-hidden="true" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    "block text-xs font-semibold",
                    has ? "text-[#ffd57a]" : "text-muted-foreground",
                  )}
                >
                  {definition.name}
                </span>
                <span className="mt-0.5 block text-[0.6875rem] leading-snug text-muted-foreground">
                  {has ? definition.description : "Locked"}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="label-mono">Badges</p>
        <p className="font-mono text-[0.6875rem] tracking-[0.08em] text-muted-foreground uppercase">
          {earned} of {BADGE_IDS.length} earned
        </p>
      </div>
      <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {BADGE_IDS.map((id) => {
          const definition = BADGES[id];
          const Icon = ICONS[id];
          const has = list.includes(id);
          return (
            <li
              key={id}
              className={cn(
                "flex items-start gap-3 rounded-xl border p-3.5",
                has ? "border-[#584211] bg-[#2b1f06]" : "border-border bg-[#0e141b]",
              )}
            >
              <span
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-lg border",
                  has
                    ? "border-[#584211] text-[#ffc53d]"
                    : "border-border bg-secondary text-muted-foreground",
                )}
              >
                {has ? (
                  <Icon className="size-[18px]" aria-hidden="true" />
                ) : (
                  <Lock className="size-4" aria-hidden="true" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p
                    className={cn(
                      "text-sm font-semibold",
                      has ? "text-[#ffd57a]" : "text-foreground",
                    )}
                  >
                    {definition.name}
                  </p>
                  {has ? (
                    <span className="inline-flex items-center gap-0.5 rounded border border-[#584211] bg-[#3a2a08] px-1 font-mono text-[0.5625rem] tracking-[0.06em] text-[#ffc53d] uppercase">
                      <Check className="size-2.5" aria-hidden="true" />
                      Earned
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {has ? definition.description : "Locked"}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
      {earned === BADGE_IDS.length ? (
        <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-[#ffd57a]">
          <Award className="size-3.5" aria-hidden="true" />
          Every MVP badge earned. Suspiciously well-read for a vibe-coder.
        </p>
      ) : null}
    </div>
  );
}

/** Small inline badge chip for the project hub and profile surfaces. */
export function BadgeChip({ id }: { id: string }) {
  if (!isBadgeId(id)) return null;
  const definition = BADGES[id];
  const Icon = ICONS[id];

  return (
    <span className="inline-flex h-6 items-center gap-1 rounded-md border border-[#584211] bg-[#2b1f06] px-2 font-mono text-[0.625rem] tracking-[0.06em] text-[#ffc53d] uppercase">
      <Icon className="size-3" aria-hidden="true" />
      {definition.name}
    </span>
  );
}

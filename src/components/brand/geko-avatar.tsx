import { cn } from "@/lib/utils";
import { GekoMark } from "./geko-mark";

export type GekoMood = "calm" | "encouraging" | "proud";

/**
 * Three moods only (BLUEPRINT §9). Each mood is a tint + ink pair, both darker than
 * the tint so the mark keeps ≥3:1 against its own background.
 */
const MOODS: Record<GekoMood, { tint: string; ink: string; rim: string }> = {
  calm: { tint: "#e7f1ea", ink: "#12694a", rim: "#cfe3d6" },
  encouraging: { tint: "#eef6dc", ink: "#4d6a12", rim: "#dce9c0" },
  proud: { tint: "#fbf0da", ink: "#8a560b", rim: "#f0dfbd" },
};

const SIZES = {
  sm: "size-8 rounded-lg",
  md: "size-11 rounded-xl",
  lg: "size-16 rounded-2xl",
} as const;

export function GekoAvatar({
  mood = "calm",
  size = "md",
  className,
  title = "Geko",
}: {
  mood?: GekoMood;
  size?: keyof typeof SIZES;
  className?: string;
  title?: string;
}) {
  const m = MOODS[mood];
  return (
    <span
      className={cn("grid shrink-0 place-items-center border", SIZES[size], className)}
      style={{ background: m.tint, borderColor: m.rim, color: m.ink }}
    >
      <GekoMark className="size-[74%]" title={title} />
    </span>
  );
}

/** Solid badge version — used for the logo and app icon. */
export function GekoBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm",
        className,
      )}
    >
      <GekoMark className="size-[78%]" strokeWidth={3.9} />
    </span>
  );
}

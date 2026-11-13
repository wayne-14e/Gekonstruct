import { cn } from "@/lib/utils";
import { GekoMark } from "./geko-mark";

export type GekoMood = "calm" | "encouraging" | "proud";

/**
 * Three moods only (BLUEPRINT §9). Each mood is a dark tint + bright ink pair, so the
 * mark keeps ≥7:1 against its own tile on the dark surface.
 */
const MOODS: Record<GekoMood, { tint: string; ink: string; rim: string }> = {
  calm: { tint: "#0e2a1c", ink: "#5be000", rim: "#1e5033" },
  encouraging: { tint: "#0b2b2b", ink: "#2dd4bf", rim: "#155149" },
  proud: { tint: "#2b1f06", ink: "#ffc53d", rim: "#584211" },
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
      className={cn(
        "grid shrink-0 place-items-center border shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
        SIZES[size],
        className,
      )}
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
        "grid size-8 shrink-0 place-items-center rounded-lg border border-[#7cf03d]/40 bg-primary text-primary-foreground shadow-[0_2px_0_var(--primary-edge)]",
        className,
      )}
    >
      <GekoMark className="size-[76%]" strokeWidth={4} />
    </span>
  );
}

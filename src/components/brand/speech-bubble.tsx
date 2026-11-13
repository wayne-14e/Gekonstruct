import { cn } from "@/lib/utils";
import { GekoAvatar, type GekoMood } from "./geko-avatar";

/**
 * Geko's speech bubble. One 🦎 is allowed per bubble (BLUEPRINT §10); everything else
 * stays plain so the mentor never becomes decoration.
 */
export function SpeechBubble({
  children,
  mood = "calm",
  label = "Geko",
  className,
  avatarSize = "md",
}: {
  children: React.ReactNode;
  mood?: GekoMood;
  label?: string | null;
  className?: string;
  avatarSize?: "sm" | "md" | "lg";
}) {
  return (
    <div className={cn("flex items-start gap-3", className)}>
      <GekoAvatar mood={mood} size={avatarSize} />
      <div className="relative min-w-0 flex-1 rounded-xl rounded-tl-sm border border-border bg-card px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        {label ? (
          <p className="mb-1 font-mono text-[0.625rem] font-medium tracking-[0.14em] text-muted-foreground uppercase">
            {label}
          </p>
        ) : null}
        <div className="text-[0.9375rem] leading-relaxed text-card-foreground">{children}</div>
      </div>
    </div>
  );
}

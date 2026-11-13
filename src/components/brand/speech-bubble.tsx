import { cn } from "@/lib/utils";
import { GekoAvatar, type GekoMood } from "./geko-avatar";

/**
 * Geko's speech bubble. One 🦎 is allowed per bubble (BLUEPRINT §10); everything
 * else stays plain so it never reads as decoration spam.
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
      <div className="relative min-w-0 flex-1 rounded-2xl rounded-tl-sm border border-border bg-card px-4 py-3 shadow-[0_1px_0_rgba(16,26,21,0.04)]">
        {label ? (
          <p className="mb-1 font-mono text-[0.6875rem] font-medium tracking-[0.08em] text-muted-foreground uppercase">
            {label}
          </p>
        ) : null}
        <div className="text-[0.9375rem] leading-relaxed text-card-foreground">{children}</div>
      </div>
    </div>
  );
}

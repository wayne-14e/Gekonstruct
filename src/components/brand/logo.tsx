import Link from "next/link";
import { cn } from "@/lib/utils";
import { GekoBadge } from "./geko-avatar";

export function Logo({
  className,
  href = "/",
  showWordmark = true,
}: {
  className?: string;
  href?: string | null;
  showWordmark?: boolean;
}) {
  const content = (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <GekoBadge />
      {showWordmark ? (
        <span className="font-display text-[1.0625rem] font-semibold tracking-[-0.02em] text-foreground">
          Gekonstruct
        </span>
      ) : null}
    </span>
  );

  if (!href) return content;

  return (
    <Link
      href={href}
      className="rounded-lg outline-offset-4 focus-visible:outline-2 focus-visible:outline-ring"
      aria-label="Gekonstruct home"
    >
      {content}
    </Link>
  );
}

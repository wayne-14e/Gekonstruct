import Link from "next/link";
import { BookOpen, Bug, Map } from "lucide-react";
import { cn } from "@/lib/utils";

export type PathwayKey = "map" | "learn" | "debug";

const ITEMS: Array<{
  key: PathwayKey;
  label: string;
  path: string;
  icon: typeof Map;
}> = [
  { key: "map", label: "Map", path: "overview", icon: Map },
  { key: "learn", label: "Learn", path: "learn", icon: BookOpen },
  { key: "debug", label: "Debug", path: "debug", icon: Bug },
];

/**
 * Shared pathway switcher for the project hub and every pathway page. A server component
 * with an explicit `active` prop keeps the pages server-rendered (no `usePathname` island).
 */
export function PathwayNav({
  projectId,
  active,
  className,
}: {
  projectId: string;
  active: PathwayKey | null;
  className?: string;
}) {
  return (
    <nav
      aria-label="Project pathways"
      className={cn(
        "flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-card p-1.5",
        className,
      )}
    >
      <span className="hidden px-2 font-mono text-[0.625rem] tracking-[0.12em] text-muted-foreground uppercase sm:inline">
        Pathways
      </span>
      {ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = active === item.key;
        return (
          <Link
            key={item.key}
            href={`/projects/${projectId}/${item.path}`}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-sm font-medium transition-colors",
              isActive
                ? "border-[#1e5033] bg-[#0e2a1c] text-foreground"
                : "border-transparent text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            <Icon
              className={cn("size-3.5", isActive ? "text-primary" : "text-muted-foreground")}
              aria-hidden="true"
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

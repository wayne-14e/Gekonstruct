import { Logo } from "@/components/brand/logo";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border/70 py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-3">
          <Logo showWordmark={false} />
          <span>
            Gekonstruct — built for people who shipped before they understood.
          </span>
        </div>
        <p className="max-w-md font-mono text-xs leading-relaxed sm:text-right">
          reads public repos · never writes · never pushes
        </p>
      </div>
    </footer>
  );
}

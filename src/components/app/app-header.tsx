import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/app/user-menu";
import type { SessionUser } from "@/lib/auth/session";

/**
 * Sticky top bar. `nav` items are passed in by the route that owns the context so the
 * header never has to guess where it is.
 */
export function AppHeader({
  user,
  nav,
  children,
}: {
  user: SessionUser | null;
  nav?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-[#0b0f14]/85 backdrop-blur-xl">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Logo />
        {nav ? (
          <nav aria-label="Main" className="ml-2 hidden items-center gap-1 sm:flex">
            {nav}
          </nav>
        ) : null}
        {children}
        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <UserMenu user={user} />
          ) : (
            <Button asChild size="sm" variant="outline">
              <Link href="/login">Sign in</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

export function HeaderLink({
  href,
  children,
  active = false,
}: {
  href: string;
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={
        active
          ? "rounded-md border border-border bg-secondary px-2.5 py-1.5 text-sm font-semibold text-foreground"
          : "rounded-md px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      }
    >
      {children}
    </Link>
  );
}

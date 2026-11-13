import { AppHeader, HeaderLink } from "@/components/app/app-header";
import { SiteFooter } from "@/components/app/site-footer";
import { requireUser } from "@/lib/auth/session";

/**
 * Shell for every signed-in route. The guard lives here so no page can forget it, and
 * the header always has a real user to render.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:text-sm focus:shadow"
      >
        Skip to content
      </a>
      <AppHeader
        user={user}
        nav={
          <>
            <HeaderLink href="/dashboard" active>
              Dashboard
            </HeaderLink>
          </>
        }
      />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}

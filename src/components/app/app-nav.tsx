"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const linkClass =
  "rounded-md px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground";
const activeLinkClass =
  "rounded-md border border-border bg-secondary px-2.5 py-1.5 text-sm font-semibold text-foreground";

export function AppNav() {
  const pathname = usePathname();
  const dashboardActive = pathname === "/dashboard";
  const projectsActive = pathname === "/projects" || pathname.startsWith("/projects/");
  const profileActive = pathname === "/profile";

  return (
    <>
      <Link
        href="/dashboard"
        aria-current={dashboardActive ? "page" : undefined}
        className={dashboardActive ? activeLinkClass : linkClass}
      >
        Dashboard
      </Link>
      <Link
        href="/projects"
        aria-current={pathname === "/projects" ? "page" : undefined}
        className={projectsActive ? activeLinkClass : linkClass}
      >
        Projects
      </Link>
      <Link
        href="/profile"
        aria-current={profileActive ? "page" : undefined}
        className={profileActive ? activeLinkClass : linkClass}
      >
        Profile
      </Link>
    </>
  );
}

"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogOut, LayoutDashboard, UserRound, FolderGit2, UsersRound } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOutAction } from "@/app/actions/auth";
import type { SessionUser } from "@/lib/auth/session";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

export function UserMenu({ user }: { user: SessionUser }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleSignOut() {
    startTransition(async () => {
      await signOutAction();
      router.push("/");
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center gap-2 rounded-full border border-border bg-card py-1 pr-2.5 pl-1 text-sm font-medium transition-colors hover:border-primary/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        aria-label={`Account menu for ${user.displayName}`}
      >
        <span className="grid size-7 place-items-center rounded-full bg-secondary text-[0.6875rem] font-semibold tracking-wide text-secondary-foreground uppercase">
          {initials(user.displayName)}
        </span>
        <span className="hidden max-w-32 truncate sm:block">{user.displayName}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="space-y-0.5">
          <span className="block text-sm font-medium text-foreground">{user.displayName}</span>
          <span className="block truncate text-xs font-normal text-muted-foreground">
            {user.email ?? "Signed in with Google"}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => router.push("/dashboard")}>
          <LayoutDashboard aria-hidden="true" />
          Dashboard
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => router.push("/projects")}>
          <FolderGit2 aria-hidden="true" />
          Projects
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => router.push("/community")}>
          <UsersRound aria-hidden="true" />
          <span className="flex-1">Community</span>
          <span className="rounded-md border border-[#584211] bg-[#2b1f06] px-1.5 py-0.5 font-mono text-[0.5625rem] tracking-[0.08em] text-[#ffc53d] uppercase">
            Coming soon
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            router.push("/profile");
          }}
        >
          <UserRound aria-hidden="true" />
          My profile
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" disabled={pending} onSelect={handleSignOut}>
          <LogOut aria-hidden="true" />
          {pending ? "Signing out…" : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

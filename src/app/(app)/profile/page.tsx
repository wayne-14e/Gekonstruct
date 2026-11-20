import type { Metadata } from "next";
import { BadgeShelf } from "@/components/app/badge-shelf";
import { AccountActions, ProfileActions } from "@/components/app/profile-actions";
import { ShareProgressButton } from "@/components/app/share-progress-button";
import { XpBadge } from "@/components/app/xp-badge";
import { getUserProfile } from "@/lib/auth/users";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "My profile",
};

export default async function ProfilePage() {
  const user = await requireUser("/profile");
  const profile = await getUserProfile(user.uid);

  const displayName = profile?.displayName ?? user.displayName;
  const badges = profile?.badges ?? [];

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-12">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="label-mono">Account</p>
          <h1 className="mt-2 text-3xl sm:text-4xl">My profile</h1>
          <p className="mt-2 max-w-xl text-muted-foreground">
            Your name, achievements, and account settings.
          </p>
        </div>
        <XpBadge totalXp={profile?.totalXp ?? 0} />
      </header>

      <div className="mt-8 grid gap-8">
        <ProfileActions initialDisplayName={displayName} />

        <section
          aria-labelledby="profile-badges-heading"
          className="rounded-2xl border border-border bg-card p-5 sm:p-6"
        >
          <h2 id="profile-badges-heading" className="sr-only">
            Your badges
          </h2>
          <BadgeShelf badges={badges} />
        </section>

        <ShareProgressButton
          displayName={displayName}
          totalXp={profile?.totalXp ?? 0}
          badges={badges}
        />

        <AccountActions />
      </div>
    </div>
  );
}

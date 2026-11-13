import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { safeNextPath } from "@/lib/nav";
import { GekoMark } from "@/components/brand/geko-mark";
import { Logo } from "@/components/brand/logo";
import { SpeechBubble } from "@/components/brand/speech-bubble";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in with Google to connect a repository and start learning your codebase.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const user = await getCurrentUser();
  const params = await searchParams;
  const nextParam = Array.isArray(params.next) ? params.next[0] : params.next;
  const next = safeNextPath(nextParam);

  if (user) redirect(next);

  return (
    <div className="relative flex min-h-dvh flex-col">
      <div className="field-grid absolute inset-0 -z-10 opacity-50 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />

      <header className="mx-auto flex h-14 w-full max-w-6xl items-center px-4 sm:px-6">
        <Logo />
      </header>

      <main id="main" className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="grid w-full max-w-4xl grid-cols-1 gap-10 lg:grid-cols-[1fr_0.85fr] lg:items-center">
          <section className="animate-rise rounded-2xl border border-border bg-card p-6 shadow-[0_20px_50px_-40px_rgba(16,26,21,0.6)] sm:p-8">
            <h1 className="text-3xl font-semibold sm:text-4xl">Sign in to Gekonstruct</h1>
            <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted-foreground">
              Google sign-in keeps your dashboard, XP and project history tied to you. We
              only ever read the public repositories you connect.
            </p>

            <div className="mt-6">
              <GoogleSignInButton next={next} />
            </div>

            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              By continuing you agree that Gekonstruct reads the public repositories you
              connect and stores an analysis snapshot. It never writes to your repo.
            </p>

            <div className="mt-6 border-t border-border/70 pt-4">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
                Back to the landing page
              </Link>
            </div>
          </section>

          <aside className="animate-rise space-y-4 [animation-delay:120ms]">
            <div className="flex items-center gap-3">
              <GekoMark className="size-10 text-primary" />
              <p className="font-mono text-[0.6875rem] tracking-[0.14em] text-muted-foreground uppercase">
                Geko, your chameleon
              </p>
            </div>
            <SpeechBubble mood="encouraging" label={null}>
              I read the code so you don&apos;t have to guess. After we sign in, bring me the
              repo that has gotten away from you — the one where a small fix breaks
              something else. 🦎
            </SpeechBubble>
          </aside>
        </div>
      </main>
    </div>
  );
}

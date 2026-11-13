import Link from "next/link";
import { GekoMark } from "@/components/brand/geko-mark";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex h-14 w-full max-w-6xl items-center px-4 sm:px-6">
        <Logo />
      </header>
      <main id="main" className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="max-w-md text-center">
          <GekoMark className="mx-auto size-16 text-primary" />
          <p className="mt-6 font-mono text-xs tracking-[0.12em] text-muted-foreground uppercase">
            404
          </p>
          <h1 className="mt-2 text-3xl font-semibold">Geko could not find that page</h1>
          <p className="mt-3 text-muted-foreground">
            The link may be old, or the project it pointed at is gone. Nothing in your
            repositories was touched.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/dashboard">Go to your dashboard</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/">Back to the landing page</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}

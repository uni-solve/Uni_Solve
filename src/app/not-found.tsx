import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main id="main" className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 text-center">
      <Logo />
      <p className="font-mono text-sm text-brand">404</p>
      <h1 className="text-3xl font-semibold">We couldn&apos;t find that page</h1>
      <p className="max-w-sm text-muted-foreground">It may have moved. But if you&apos;re stuck on something else, we can help with that.</p>
      <div className="flex gap-2">
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          Go home
        </Link>
        <Link href="/post" className={buttonVariants()}>
          Post Your Problem
        </Link>
      </div>
    </main>
  );
}

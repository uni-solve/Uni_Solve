import type { Metadata } from "next";
import Link from "next/link";
import { Lock } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.1fr]">
      <div className="flex flex-col px-4 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Link href="/" aria-label="UniSolve home">
            <Logo />
          </Link>
          <ThemeToggle />
        </div>
        <main id="main" className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          {children}
        </main>
        <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="size-3" aria-hidden /> Private & secure. We never share your details.
        </p>
      </div>
      <aside className="relative hidden overflow-hidden bg-navy text-navy-foreground lg:flex lg:flex-col lg:justify-end lg:p-14 dark:bg-card">
        <div className="bg-grid absolute inset-0 opacity-20" aria-hidden />
        <div className="relative max-w-md">
          <p className="text-4xl leading-tight font-semibold">Stuck on something?</p>
          <p className="mt-2 text-4xl leading-tight font-semibold text-brand">Let&apos;s solve it.</p>
          <p className="mt-6 text-navy-foreground/70">
            Private, expert support for academics, coding, projects, research and career preparation.
          </p>
        </div>
      </aside>
    </div>
  );
}

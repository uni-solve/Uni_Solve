"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { buttonVariants, Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { mainNav, routes } from "@/lib/site";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full border-b border-transparent transition-colors",
        scrolled && "border-border bg-background/80 backdrop-blur-lg",
      )}
    >
      <div className="container-page flex h-16 items-center gap-6">
        <Link href={routes.home} aria-label="UniSolve home" className="rounded-md">
          <Logo />
        </Link>

        <nav aria-label="Main" className="hidden flex-1 items-center gap-1 lg:flex">
          {mainNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <ThemeToggle />
          <Link href={routes.login} className={cn(buttonVariants({ variant: "ghost" }), "hidden sm:inline-flex")}>
            Log In
          </Link>
          <Link href={routes.postProblem} className={cn(buttonVariants(), "hidden sm:inline-flex")}>
            Post Your Problem
          </Link>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger render={<Button variant="ghost" size="icon" aria-label="Open menu" className="lg:hidden" />}>
              <Menu />
            </SheetTrigger>
            <SheetContent side="right" className="w-full max-w-xs p-6">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <Logo />
              <nav aria-label="Mobile" className="mt-6 flex flex-col">
                {mainNav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="border-b py-3 text-base font-medium"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
              <div className="mt-auto flex flex-col gap-2">
                <Link href={routes.login} onClick={() => setOpen(false)} className={buttonVariants({ variant: "outline", size: "lg" })}>
                  Log In
                </Link>
                <Link href={routes.postProblem} onClick={() => setOpen(false)} className={buttonVariants({ size: "lg" })}>
                  Post Your Problem
                </Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

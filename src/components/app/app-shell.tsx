"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut, Menu, Plus, type LucideIcon } from "lucide-react";
import { RequireRole } from "@/components/auth/require-role";
import { Logo } from "@/components/brand/logo";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth, type Role } from "@/lib/auth/auth-provider";
import { cn } from "@/lib/utils";
import { NotificationBell } from "./notification-bell";

export type NavItem = { label: string; href: string; icon: LucideIcon; match?: string[] };

function SidebarNav({ nav, onNavigate }: { nav: NavItem[]; onNavigate?: () => void }) {
  const pathname = usePathname().replace(/\/$/, "") || "/";
  const isActive = (item: NavItem) => {
    const paths = [item.href, ...(item.match ?? [])];
    return paths.some((p) => (p.split("/").length <= 2 ? pathname === p : pathname === p || pathname.startsWith(`${p}/`)));
  };
  return (
    <nav aria-label="Dashboard" className="flex flex-col gap-0.5">
      {nav.map((item) => {
        const Icon = item.icon;
        const active = isActive(item);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground",
              active && "bg-sidebar-accent font-medium text-foreground",
            )}
          >
            <Icon className={cn("size-4", active && "text-brand")} aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({
  nav,
  roles,
  allowAnonymous = false,
  areaLabel,
  showPostButton = false,
  children,
}: {
  nav: NavItem[];
  roles: Role[];
  allowAnonymous?: boolean;
  areaLabel: string;
  showPostButton?: boolean;
  children: React.ReactNode;
}) {
  const { profile, user, isAnonymous, signOut } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const name = profile?.display_name || (isAnonymous ? "Guest" : user?.email?.split("@")[0]) || "You";

  async function logout() {
    await signOut();
    router.replace("/");
  }

  const account = (
    <div className="flex items-center gap-3 rounded-xl border bg-background p-3">
      <Avatar className="size-8">
        <AvatarFallback className="bg-brand-soft text-xs font-semibold text-accent-foreground">{name.slice(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{name}</p>
        <p className="truncate text-xs text-muted-foreground">{isAnonymous ? "Private guest" : areaLabel}</p>
      </div>
      <Button variant="ghost" size="icon-sm" onClick={logout} aria-label="Log out">
        <LogOut />
      </Button>
    </div>
  );

  return (
    <RequireRole roles={roles} allowAnonymous={allowAnonymous}>
      <div className="min-h-dvh lg:grid lg:grid-cols-[256px_1fr]">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-dvh flex-col gap-6 border-r bg-sidebar p-4 lg:flex">
          <Link href="/" className="px-2 pt-1" aria-label="UniSolve home">
            <Logo />
          </Link>
          {showPostButton && (
            <Link href="/post" className={buttonVariants({ className: "w-full" })}>
              <Plus /> Get It Solved
            </Link>
          )}
          <div className="flex-1 overflow-y-auto">
            <SidebarNav nav={nav} />
          </div>
          {account}
        </aside>

        <div className="flex min-w-0 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/85 px-4 backdrop-blur-lg sm:px-6">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger render={<Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation" />}>
                <Menu />
              </SheetTrigger>
              <SheetContent side="left" className="w-72 gap-6 bg-sidebar p-4">
                <SheetTitle className="sr-only">Navigation</SheetTitle>
                <Logo className="px-2 pt-1" />
                <SidebarNav nav={nav} onNavigate={() => setOpen(false)} />
                <div className="mt-auto">{account}</div>
              </SheetContent>
            </Sheet>
            <Link href="/" className="lg:hidden" aria-label="UniSolve home">
              <Logo showWordmark={false} />
            </Link>
            <p className="hidden text-sm text-muted-foreground lg:block">{areaLabel}</p>
            <div className="ml-auto flex items-center gap-1">
              <ThemeToggle />
              <NotificationBell />
            </div>
          </header>
          <main id="main" className="w-full max-w-6xl flex-1 px-4 py-6 pb-28 sm:px-6 lg:px-8 lg:py-8 lg:pb-10">
            {children}
          </main>
        </div>
      </div>
      {showPostButton && <MobileBottomNav />}
    </RequireRole>
  );
}

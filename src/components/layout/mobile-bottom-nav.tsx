"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Inbox, MessageSquare, Plus, User } from "lucide-react";
import { routes } from "@/lib/site";
import { cn } from "@/lib/utils";

const items = [
  { label: "Home", href: routes.home, icon: Home },
  { label: "Requests", href: routes.requests, icon: Inbox },
  { label: "Messages", href: routes.messages, icon: MessageSquare },
  { label: "Profile", href: routes.profile, icon: User },
];

/** Phone-only bottom navigation with a raised "Get It Solved" action in the middle. */
export function MobileBottomNav() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  const [left, right] = [items.slice(0, 2), items.slice(2)];

  const renderItem = ({ label, href, icon: Icon }: (typeof items)[number]) => (
    <Link
      key={href}
      href={href}
      aria-current={isActive(href) ? "page" : undefined}
      className={cn(
        "flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium text-muted-foreground",
        isActive(href) && "text-foreground",
      )}
    >
      <Icon className="size-5" aria-hidden />
      {label}
    </Link>
  );

  return (
    <nav
      aria-label="Primary mobile"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg lg:hidden"
    >
      <div className="mx-auto flex max-w-md items-end px-2">
        {left.map(renderItem)}
        <div className="flex flex-1 justify-center">
          <Link
            href={routes.postProblem}
            aria-label="Get It Solved"
            className="-mt-5 flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30 ring-4 ring-background transition-transform active:scale-95"
          >
            <Plus className="size-6" aria-hidden />
          </Link>
        </div>
        {right.map(renderItem)}
      </div>
    </nav>
  );
}

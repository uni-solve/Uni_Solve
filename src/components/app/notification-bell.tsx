"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth/auth-provider";
import { listNotifications, markNotificationsRead, subscribeToNotifications, type AppNotification } from "@/lib/data/notifications";
import { formatDate } from "@/lib/requests/status";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const { user } = useAuth();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const unread = items.filter((n) => !n.read_at).length;

  useEffect(() => {
    if (!user) return;
    listNotifications().then(setItems).catch(() => {});
    return subscribeToNotifications(user.id, (n) => {
      setItems((prev) => [n, ...prev].slice(0, 30));
      toast(n.title, { description: n.body ?? undefined });
    });
  }, [user]);

  async function markAll() {
    await markNotificationsRead().catch(() => {});
    setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={<Button variant="ghost" size="icon" className="relative" aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"} />}
      >
        <Bell />
        {unread > 0 && (
          <span className="absolute top-1 right-1 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] leading-4 font-semibold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </SheetTrigger>
      <SheetContent side="right" className="w-full max-w-sm gap-0 p-0">
        <div className="flex items-center justify-between border-b px-5 py-4 pr-14">
          <SheetTitle>Notifications</SheetTitle>
          {unread > 0 && (
            <Button variant="ghost" size="sm" onClick={markAll}>
              <CheckCheck /> Mark all read
            </Button>
          )}
        </div>
        {items.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">You&apos;re all caught up.</p>
        ) : (
          <ul className="divide-y overflow-y-auto">
            {items.map((n) => (
              <li key={n.id}>
                <Link
                  href={n.link ?? "#"}
                  onClick={() => {
                    setOpen(false);
                    if (!n.read_at) {
                      markNotificationsRead([n.id]).catch(() => {});
                      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)));
                    }
                  }}
                  className={cn("flex gap-3 px-5 py-4 hover:bg-muted", !n.read_at && "bg-brand-soft/40")}
                >
                  <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.read_at ? "bg-transparent" : "bg-brand")} aria-hidden />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{n.title}</span>
                    {n.body && <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">{n.body}</span>}
                    <span className="mt-1 block text-[11px] text-muted-foreground">{formatDate(n.created_at, true)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </SheetContent>
    </Sheet>
  );
}

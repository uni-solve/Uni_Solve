"use client";

import { BarChart3, CreditCard, History, Inbox, LayoutDashboard, LifeBuoy, Settings, Star, TicketPercent, Users } from "lucide-react";
import { AppShell, type NavItem } from "@/components/app/app-shell";

const nav: NavItem[] = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard },
  { label: "Requests", href: "/admin/requests", icon: Inbox, match: ["/admin/request"] },
  { label: "Payments", href: "/admin/payments", icon: CreditCard },
  { label: "Students", href: "/admin/students", icon: Users },
  { label: "Support", href: "/admin/support", icon: LifeBuoy },
  { label: "Reviews", href: "/admin/reviews", icon: Star },
  { label: "Coupons", href: "/admin/coupons", icon: TicketPercent },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
  { label: "Settings", href: "/admin/settings", icon: Settings },
  { label: "Audit log", href: "/admin/audit", icon: History },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell nav={nav} roles={["admin"]} areaLabel="Admin">
      {children}
    </AppShell>
  );
}

"use client";

import { CreditCard, FolderLock, Inbox, LayoutDashboard, LifeBuoy, MessageSquare, Shield, User } from "lucide-react";
import { AppShell, type NavItem } from "@/components/app/app-shell";

const nav: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "My Requests", href: "/dashboard/requests", icon: Inbox, match: ["/dashboard/request"] },
  { label: "Messages", href: "/dashboard/messages", icon: MessageSquare },
  { label: "Files", href: "/dashboard/files", icon: FolderLock },
  { label: "Payments", href: "/dashboard/payments", icon: CreditCard },
  { label: "Profile", href: "/dashboard/profile", icon: User },
  { label: "Privacy", href: "/dashboard/privacy", icon: Shield },
  { label: "Support", href: "/dashboard/support", icon: LifeBuoy },
];

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell nav={nav} roles={["student"]} allowAnonymous areaLabel="Student dashboard" showPostButton>
      {children}
    </AppShell>
  );
}

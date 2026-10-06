"use client";

import Link from "next/link";
import { UserRoundPlus } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-provider";

/** Reminds private-guest users to attach an email so they don't lose access. */
export function GuestBanner() {
  const { isAnonymous } = useAuth();
  if (!isAnonymous) return null;
  return (
    <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-warning/30 bg-warning-soft/60 p-4 sm:flex-row sm:items-center">
      <UserRoundPlus className="size-5 shrink-0 text-warning" aria-hidden />
      <p className="flex-1 text-sm">
        You&apos;re using a <strong>private guest session</strong> on this device. Add your email to keep access from anywhere and get updates.
      </p>
      <Link href="/dashboard/profile#account" className="text-sm font-medium text-foreground underline underline-offset-2">
        Add email
      </Link>
    </div>
  );
}

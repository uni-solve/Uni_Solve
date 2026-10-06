"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { homeForRole, useAuth, type Role } from "@/lib/auth/auth-provider";
import { BackendNotConfigured } from "./backend-not-configured";

/**
 * Client-side route guard for UX only. Real enforcement is Row-Level Security in
 * the database: even if this guard were bypassed, no data would be returned.
 */
export function RequireRole({
  roles,
  allowAnonymous = false,
  children,
}: {
  roles: Role[];
  allowAnonymous?: boolean;
  children: React.ReactNode;
}) {
  const { configured, loading, user, profile, isAnonymous } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (configured && !loading && (!user || (isAnonymous && !allowAnonymous))) {
      const next = encodeURIComponent(window.location.pathname.replace(process.env.NEXT_PUBLIC_BASE_PATH ?? "", "") + window.location.search);
      router.replace(`/login?next=${next}`);
    }
  }, [configured, loading, user, isAnonymous, allowAnonymous, router]);

  if (!configured) return <BackendNotConfigured />;

  if (loading || !user || (user && !profile)) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-live="polite">
        <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden />
        <span className="sr-only">Loading…</span>
      </div>
    );
  }

  if (profile?.is_suspended || !roles.includes(profile!.role)) {
    return (
      <div className="container-page flex min-h-[50vh] flex-col items-center justify-center text-center">
        <ShieldAlert className="size-8 text-warning" aria-hidden />
        <h1 className="mt-4 text-2xl font-semibold">{profile?.is_suspended ? "Account suspended" : "You don't have access to this area"}</h1>
        <p className="mt-2 max-w-sm text-muted-foreground">
          {profile?.is_suspended ? "Please contact support if you think this is a mistake." : "This section is for a different account type."}
        </p>
        <Link href={homeForRole(profile?.role)} className={`${buttonVariants({ variant: "outline" })} mt-6`}>
          Go to my dashboard
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}

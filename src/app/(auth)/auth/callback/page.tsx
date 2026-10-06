"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { homeForRole, useAuth } from "@/lib/auth/auth-provider";
import { safeNext } from "@/lib/auth/safe-next";

/**
 * Landing page for email confirmation, password reset and Google sign-in links.
 * supabase-js exchanges the ?code= for a session automatically (PKCE); we just
 * wait for it and then continue to `next`.
 */
function Callback() {
  const router = useRouter();
  const params = useSearchParams();
  const { loading, user, profile } = useAuth();
  const [timedOut, setTimedOut] = useState(false);
  const error = params.get("error_description");

  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 8000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!loading && user && profile) router.replace(safeNext(params.get("next"), homeForRole(profile.role)));
  }, [loading, user, profile, params, router]);

  if (error || timedOut) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-semibold">That link didn&apos;t work</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error ?? "It may have expired or already been used."}</p>
        <Link href="/login" className={`${buttonVariants()} mt-6`}>Back to log in</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 text-center" role="status" aria-live="polite">
      <Loader2 className="size-6 animate-spin text-brand" aria-hidden />
      <p className="text-sm text-muted-foreground">Signing you in…</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense>
      <Callback />
    </Suspense>
  );
}

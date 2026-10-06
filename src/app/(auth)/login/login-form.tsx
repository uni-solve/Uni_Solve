"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { BackendNotConfigured } from "@/components/auth/backend-not-configured";
import { GoogleButton } from "@/components/auth/google-button";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { homeForRole, useAuth } from "@/lib/auth/auth-provider";
import { safeNext } from "@/lib/auth/safe-next";
import { friendlyError, getSupabase } from "@/lib/supabase/client";

const schema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});
type Values = z.infer<typeof schema>;

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { configured, user, profile, isAnonymous } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const next = params.get("next");

  const { register, handleSubmit, formState } = useForm<Values>({ resolver: zodResolver(schema) });

  // Already signed in (and not a temporary anonymous session): go to dashboard.
  useEffect(() => {
    if (user && profile && !isAnonymous) router.replace(safeNext(next, homeForRole(profile.role)));
  }, [user, profile, isAnonymous, next, router]);

  if (!configured) return <BackendNotConfigured />;

  async function onSubmit(values: Values) {
    setFormError(null);
    const { error } = await getSupabase().auth.signInWithPassword(values);
    if (error) setFormError(friendlyError(error));
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Welcome back</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">Log in to track your requests and messages.</p>

      <div className="mt-8 grid gap-4">
        <GoogleButton next={safeNext(next)} />
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-4 grid gap-4">
        <FormField id="email" label="Email" error={formState.errors.email?.message}>
          {(aria) => <Input {...aria} type="email" autoComplete="email" inputMode="email" {...register("email")} />}
        </FormField>
        <FormField
          id="password"
          label={
            <span className="flex w-full items-center justify-between">
              Password
              <Link href="/forgot-password" className="text-xs font-normal text-brand hover:underline">
                Forgot password?
              </Link>
            </span>
          }
          error={formState.errors.password?.message}
        >
          {(aria) => <Input {...aria} type="password" autoComplete="current-password" {...register("password")} />}
        </FormField>
        {formError && (
          <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-destructive">
            {formError}
          </p>
        )}
        <Button type="submit" size="lg" disabled={formState.isSubmitting}>
          {formState.isSubmitting && <Loader2 className="animate-spin" aria-hidden />}
          Log In
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        New to UniSolve?{" "}
        <Link href={`/signup${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-medium text-foreground hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}

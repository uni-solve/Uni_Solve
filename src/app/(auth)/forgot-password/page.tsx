"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Loader2, MailCheck } from "lucide-react";
import { BackendNotConfigured } from "@/components/auth/backend-not-configured";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { appUrl, friendlyError, getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

const schema = z.object({ email: z.email("Enter a valid email address") });

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });

  if (!isSupabaseConfigured) return <BackendNotConfigured />;

  async function onSubmit({ email }: z.infer<typeof schema>) {
    setFormError(null);
    const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
      redirectTo: appUrl("/auth/callback/?next=/reset-password"),
    });
    // Always show the same confirmation so this form can't be used to discover accounts.
    if (error && /rate limit|Too many/i.test(error.message)) return setFormError(friendlyError(error));
    setSent(true);
  }

  return (
    <div>
      <Link href="/login" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> Back to log in
      </Link>
      {sent ? (
        <div className="mt-8 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-success-soft text-success">
            <MailCheck className="size-5" aria-hidden />
          </span>
          <h1 className="mt-5 text-2xl font-semibold">Check your email</h1>
          <p className="mt-2 text-sm text-muted-foreground">If an account exists for that email, you&apos;ll get a link to reset your password.</p>
        </div>
      ) : (
        <>
          <h1 className="mt-6 text-2xl font-semibold">Reset your password</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Enter your email and we&apos;ll send you a reset link.</p>
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-8 grid gap-4">
            <FormField id="email" label="Email" error={formState.errors.email?.message}>
              {(aria) => <Input {...aria} type="email" autoComplete="email" {...register("email")} />}
            </FormField>
            {formError && <p role="alert" className="text-sm text-destructive">{formError}</p>}
            <Button type="submit" size="lg" disabled={formState.isSubmitting}>
              {formState.isSubmitting && <Loader2 className="animate-spin" aria-hidden />}
              Send reset link
            </Button>
          </form>
        </>
      )}
    </div>
  );
}

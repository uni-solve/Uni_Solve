"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, MailCheck } from "lucide-react";
import { BackendNotConfigured } from "@/components/auth/backend-not-configured";
import { GoogleButton } from "@/components/auth/google-button";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth/auth-provider";
import { safeNext } from "@/lib/auth/safe-next";
import { appUrl, friendlyError, getSupabase } from "@/lib/supabase/client";
import { displayNameSchema, passwordSchema, referralCodeSchema } from "@/lib/validation";

const schema = z.object({
  displayName: displayNameSchema,
  email: z.email("Enter a valid email address"),
  password: passwordSchema,
  referralCode: referralCodeSchema,
  agree: z.boolean().refine((v) => v, "Please accept to continue"),
});
type Values = z.infer<typeof schema>;

export function SignupForm() {
  const params = useSearchParams();
  const router = useRouter();
  const { configured } = useAuth();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const next = safeNext(params.get("next"));

  const { register, handleSubmit, control, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { referralCode: params.get("ref") ?? "", agree: false },
  });

  if (!configured) return <BackendNotConfigured />;

  async function onSubmit(values: Values) {
    setFormError(null);
    const { data, error } = await getSupabase().auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        emailRedirectTo: appUrl(`/auth/callback/?next=${encodeURIComponent(next)}`),
        data: { role: "student", display_name: values.displayName || null, referral_code: values.referralCode || null },
      },
    });
    if (error) return setFormError(friendlyError(error));
    if (data.session) router.replace(next);   // email confirmation disabled
    else setSentTo(values.email);              // confirmation email sent
  }

  if (sentTo) {
    return (
      <div className="text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-success-soft text-success">
          <MailCheck className="size-5" aria-hidden />
        </span>
        <h1 className="mt-5 text-2xl font-semibold">Check your inbox</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We sent a confirmation link to <strong className="text-foreground">{sentTo}</strong>. Open it to activate your account.
        </p>
        <p className="mt-6 text-xs text-muted-foreground">Didn&apos;t get it? Check spam, or wait a minute and try signing up again.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Create your account</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">Only your email is required. Your college and full name stay private.</p>

      <div className="mt-8 grid gap-4">
        <GoogleButton next={next} />
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-4 grid gap-4">
        <FormField id="displayName" label="What should we call you?" optional hint="A first name or nickname is fine." error={formState.errors.displayName?.message}>
          {(aria) => <Input {...aria} autoComplete="nickname" {...register("displayName")} />}
        </FormField>
        <FormField id="email" label="Email" error={formState.errors.email?.message}>
          {(aria) => <Input {...aria} type="email" autoComplete="email" inputMode="email" {...register("email")} />}
        </FormField>
        <FormField id="password" label="Password" hint="At least 8 characters, with a letter and a number." error={formState.errors.password?.message}>
          {(aria) => <Input {...aria} type="password" autoComplete="new-password" {...register("password")} />}
        </FormField>
        <FormField id="referralCode" label="Referral code" optional error={formState.errors.referralCode?.message}>
          {(aria) => <Input {...aria} placeholder="UNI-ROS123" className="font-mono uppercase" {...register("referralCode")} />}
        </FormField>

        <Controller
          control={control}
          name="agree"
          render={({ field, fieldState }) => (
            <div>
              <label className="flex items-start gap-2.5 text-sm text-muted-foreground">
                <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(Boolean(v))} className="mt-0.5" aria-invalid={fieldState.error ? true : undefined} />
                <span>
                  I agree to the{" "}
                  <Link href="/legal/terms-of-service" className="text-foreground underline underline-offset-2">Terms</Link>,{" "}
                  <Link href="/legal/privacy-policy" className="text-foreground underline underline-offset-2">Privacy Policy</Link> and{" "}
                  <Link href="/legal/academic-integrity" className="text-foreground underline underline-offset-2">Academic Integrity Policy</Link>.
                </span>
              </label>
              {fieldState.error && <p role="alert" className="mt-1.5 text-sm text-destructive">{fieldState.error.message}</p>}
            </div>
          )}
        />

        {formError && (
          <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-destructive">
            {formError}
          </p>
        )}
        <Button type="submit" size="lg" disabled={formState.isSubmitting}>
          {formState.isSubmitting && <Loader2 className="animate-spin" aria-hidden />}
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-foreground hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}

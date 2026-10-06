"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { BackendNotConfigured } from "@/components/auth/backend-not-configured";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { homeForRole, useAuth } from "@/lib/auth/auth-provider";
import { friendlyError, getSupabase } from "@/lib/supabase/client";
import { passwordSchema } from "@/lib/validation";

const schema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Passwords don't match" });

export default function ResetPasswordPage() {
  const router = useRouter();
  const { configured, loading, user, profile } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });

  if (!configured) return <BackendNotConfigured />;
  if (!loading && !user) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Link expired</h1>
        <p className="mt-2 text-sm text-muted-foreground">This reset link is no longer valid. Request a new one.</p>
        <Button className="mt-6" onClick={() => router.push("/forgot-password")}>Request a new link</Button>
      </div>
    );
  }

  async function onSubmit({ password }: z.infer<typeof schema>) {
    setFormError(null);
    const { error } = await getSupabase().auth.updateUser({ password });
    if (error) return setFormError(friendlyError(error));
    toast.success("Password updated");
    router.replace(homeForRole(profile?.role));
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Choose a new password</h1>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-8 grid gap-4">
        <FormField id="password" label="New password" hint="At least 8 characters, with a letter and a number." error={formState.errors.password?.message}>
          {(aria) => <Input {...aria} type="password" autoComplete="new-password" {...register("password")} />}
        </FormField>
        <FormField id="confirm" label="Confirm password" error={formState.errors.confirm?.message}>
          {(aria) => <Input {...aria} type="password" autoComplete="new-password" {...register("confirm")} />}
        </FormField>
        {formError && <p role="alert" className="text-sm text-destructive">{formError}</p>}
        <Button type="submit" size="lg" disabled={formState.isSubmitting || loading}>
          {formState.isSubmitting && <Loader2 className="animate-spin" aria-hidden />}
          Update password
        </Button>
      </form>
    </div>
  );
}

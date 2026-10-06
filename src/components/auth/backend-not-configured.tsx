import { PlugZap } from "lucide-react";

/** Shown when the site is built without Supabase credentials. */
export function BackendNotConfigured() {
  return (
    <div className="container-page flex min-h-[50vh] flex-col items-center justify-center py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-warning-soft text-warning">
        <PlugZap className="size-5" aria-hidden />
      </span>
      <h1 className="mt-5 text-2xl font-semibold">Accounts are opening soon</h1>
      <p className="mt-2 max-w-md text-muted-foreground">
        Sign-in and dashboards are being connected. Please check back shortly.
      </p>
    </div>
  );
}

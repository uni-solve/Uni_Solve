"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { RequestTimeline } from "@/components/request-timeline";
import { StatusBadge } from "@/components/status-indicator";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trackRequest } from "@/lib/data/requests";
import { formatDate, statusMeta, type RequestStatus } from "@/lib/requests/status";
import { friendlyError, isSupabaseConfigured } from "@/lib/supabase/client";

type Result = Awaited<ReturnType<typeof trackRequest>>;

export function TrackForm() {
  const params = useSearchParams();
  const [code, setCode] = useState(params.get("id") ?? "");
  const [key, setKey] = useState(params.get("key") ?? "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | undefined>();
  const [error, setError] = useState<string>();

  const lookup = useCallback(async (c: string, k: string) => {
    setError(undefined);
    if (!/^US-\d{5,6}$/i.test(c.trim())) return setError("Request IDs look like US-48291");
    if (k.trim().length < 8) return setError("Enter the tracking key from your confirmation");
    setLoading(true);
    try {
      setResult(await trackRequest(c, k));
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = params.get("id");
    const k = params.get("key");
    if (id && k && isSupabaseConfigured) lookup(id, k);
  }, [params, lookup]);

  return (
    <div className="grid gap-8">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          lookup(code, key);
        }}
        className="grid gap-4 rounded-2xl border bg-card p-6"
      >
        <FormField id="code" label="Request ID">
          {(aria) => <Input {...aria} placeholder="US-48291" className="font-mono uppercase" value={code} onChange={(e) => setCode(e.target.value)} />}
        </FormField>
        <FormField id="key" label="Tracking key">
          {(aria) => <Input {...aria} className="font-mono" value={key} onChange={(e) => setKey(e.target.value)} autoComplete="off" />}
        </FormField>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button type="submit" size="lg" disabled={loading || !isSupabaseConfigured}>
          {loading ? <Loader2 className="animate-spin" aria-hidden /> : <Search aria-hidden />} Track request
        </Button>
      </form>

      {result === null && (
        <p role="status" className="rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">
          We couldn&apos;t find a request with that ID and key. Check both and try again.
        </p>
      )}

      {result && (
        <section aria-live="polite" className="rounded-2xl border bg-card p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-mono text-sm text-muted-foreground">#{result.code}</p>
              <p className="mt-1 text-lg font-semibold">{result.category}</p>
              <p className="text-xs text-muted-foreground">Submitted {formatDate(result.submitted_at, true)}</p>
            </div>
            <StatusBadge tone={statusMeta[result.status as RequestStatus].tone} pulse={statusMeta[result.status as RequestStatus].live}>
              {statusMeta[result.status as RequestStatus].label}
            </StatusBadge>
          </div>
          <div className="mt-6 border-t pt-6">
            <RequestTimeline status={result.status as RequestStatus} events={result.events} />
          </div>
        </section>
      )}
    </div>
  );
}

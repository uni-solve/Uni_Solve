import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** False until the Supabase project URL + anon key are configured. */
export const isSupabaseConfigured = Boolean(url && anonKey);

let client: SupabaseClient | null = null;

/**
 * Browser Supabase client. Only the public anon key is ever used here —
 * every read and write is authorised by Row-Level Security in the database.
 */
export function getSupabase(): SupabaseClient {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }
  client ??= createClient(url!, anonKey!, {
    auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return client;
}

/** Absolute URL inside this app, respecting the GitHub Pages base path. */
export function appUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return `${window.location.origin}${base}${path}`;
}

/** Turns Postgres / Supabase errors into a message safe to show users. */
export function friendlyError(error: unknown): string {
  const message = (error as { message?: string })?.message ?? "Something went wrong. Please try again.";
  if (/Invalid login credentials/i.test(message)) return "Incorrect email or password.";
  if (/Email not confirmed/i.test(message)) return "Please confirm your email first — check your inbox.";
  if (/User already registered/i.test(message)) return "An account with this email already exists. Try logging in.";
  if (/permission denied|row-level security|42501/i.test(message)) return "You don't have access to do that.";
  if (/Failed to fetch|NetworkError/i.test(message)) return "Can't reach UniSolve right now. Check your connection.";
  if (/rate limit|Too many/i.test(message)) return "Too many attempts. Please wait a moment and try again.";
  return message;
}

-- =============================================================================
-- UniSolve · 0015 · Security hardening (Supabase advisor findings)
-- =============================================================================

-- Pin search_path on the remaining helper functions.
alter function public.touch_updated_at() set search_path = public;
alter function public.random_digits(int) set search_path = public;
alter function public.try_uuid(text) set search_path = public;

-- Trigger-only function: never callable through the API.
revoke execute on function public.audit_settings_change() from public, anon, authenticated;

-- Internal helpers used only by other server-side functions.
revoke execute on function public.random_digits(int), public.generate_referral_code(text),
  public.add_request_event(uuid, public.request_status, text, text),
  public.notify_admins(public.notification_type, text, text, text, uuid),
  public.on_payment_verified(uuid), public.assign_expert(uuid, uuid), public.respread_milestones(uuid, integer),
  public.classify_request(text, text), public.estimate_request(smallint, int, int, public.deadline_option, timestamptz),
  public.handle_new_user(), public.track_referral(), public.on_message_insert(), public.refresh_expert_rating()
from public, anon, authenticated;

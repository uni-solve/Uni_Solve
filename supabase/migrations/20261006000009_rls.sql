-- =============================================================================
-- UniSolve · 0009 · Row-Level Security, privileges and realtime
--
-- Model:
--   * The browser only ever holds the anon key + the user's JWT.
--   * Every table has RLS enabled. No policy = no access.
--   * Clients get INSERT/UPDATE only on specific columns; workflow columns
--     (status, price, role, credits, ...) change only through the SECURITY
--     DEFINER functions in 0007/0008, which check the caller themselves.
--   * Later migrations that add tables/functions must add grants + policies.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Start from zero: strip default write privileges and function access.
-- ---------------------------------------------------------------------------
revoke insert, update, delete, truncate, references, trigger on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;

-- Helpers evaluated inside policies run as the caller and must be executable.
grant execute on function
  public.my_role(), public.is_admin(), public.is_approved_expert(uuid),
  public.is_request_student(uuid), public.is_request_expert(uuid),
  public.can_access_request(uuid), public.has_open_offer(uuid)
to anon, authenticated;

-- Client-callable RPCs.
grant execute on function
  public.preview_request(text, text, text, public.deadline_option, timestamptz),
  public.track_request(text, text),
  public.get_public_stats()
to anon, authenticated;

grant execute on function
  public.create_request(text, text, text, public.deadline_option, timestamptz, public.budget_option, integer, integer, boolean, public.contact_preference),
  public.cancel_request(uuid, text),
  public.apply_coupon(uuid, text),
  public.remove_coupon(uuid),
  public.submit_upi_payment(uuid, text, text, boolean),
  public.respond_to_offer(uuid, boolean),
  public.expert_start_work(uuid),
  public.expert_deliver_milestone(uuid, text),
  public.student_review_milestone(uuid, boolean, text),
  public.submit_review(uuid, int, text, boolean),
  public.raise_dispute(uuid, text, text),
  public.create_support_ticket(text, text, text, uuid),
  public.mark_notifications_read(uuid[]),
  public.get_student_overview(),
  public.get_expert_overview(),
  public.expert_balance(uuid),
  -- admin RPCs: each checks is_admin() internally
  public.admin_set_quote(uuid, integer, jsonb, text),
  public.admin_review_payment(uuid, boolean, text),
  public.match_experts(uuid, int),
  public.admin_send_offers(uuid, uuid[]),
  public.admin_assign_expert(uuid, uuid),
  public.admin_review_application(uuid, public.verification_status, text),
  public.admin_set_user_role(uuid, public.user_role),
  public.admin_set_suspended(uuid, boolean, text),
  public.admin_refund_payment(uuid, integer, boolean, text),
  public.admin_create_payout(uuid, integer),
  public.admin_mark_payout(uuid, public.payout_status, text),
  public.get_admin_metrics(),
  public.get_admin_timeseries(int)
to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Enable RLS everywhere.
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Can the caller see this person's basic profile (display name/avatar)?
-- Self, admins, and counterparts on a shared request — except a student who
-- posted anonymously stays hidden from their expert.
create or replace function public.can_view_profile(pid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select pid = auth.uid() or public.is_admin()
    or exists (select 1 from public.requests r where r.student_id = auth.uid() and r.assigned_expert_id = pid)
    or exists (select 1 from public.requests r where r.assigned_expert_id = auth.uid() and r.student_id = pid and not r.is_anonymous)
    or exists (select 1 from public.expert_profiles e where e.user_id = pid and e.verification_status = 'approved')
$$;
grant execute on function public.can_view_profile(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Identity
-- ---------------------------------------------------------------------------
create policy "profiles: visible to self, admins and counterparts" on public.profiles
  for select to authenticated using (public.can_view_profile(id));
create policy "profiles: users update their own row" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
grant update (display_name, avatar_path) on public.profiles to authenticated;

create policy "student_profiles: self or admin" on public.student_profiles
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "student_profiles: self update" on public.student_profiles
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
grant update (phone, institution, level, default_anonymous) on public.student_profiles to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Catalog & settings (public read, admin write)
-- ---------------------------------------------------------------------------
create policy "categories: public read" on public.categories for select to anon, authenticated using (is_active or public.is_admin());
create policy "categories: admin write" on public.categories for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "work_types: public read" on public.work_types for select to anon, authenticated using (true);
create policy "work_types: admin write" on public.work_types for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "skills: public read" on public.skills for select to anon, authenticated using (true);
create policy "skills: admin write" on public.skills for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant insert, update, delete on public.categories, public.work_types, public.skills to authenticated;
grant usage on sequence public.categories_id_seq, public.skills_id_seq to authenticated;

create policy "settings: readable" on public.platform_settings for select to anon, authenticated using (true);
create policy "settings: admin update" on public.platform_settings for update to authenticated using (public.is_admin()) with check (public.is_admin());
grant update on public.platform_settings to authenticated;

create or replace function public.audit_settings_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  perform public.audit('settings.update', 'platform_settings', 'singleton',
    jsonb_build_object('before', to_jsonb(old), 'after', to_jsonb(new)));
  return new;
end $$;
create trigger platform_settings_audit before update on public.platform_settings
  for each row execute function public.audit_settings_change();

-- ---------------------------------------------------------------------------
-- 5. Experts
-- ---------------------------------------------------------------------------
create policy "applications: applicant or admin read" on public.expert_applications
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "applications: applicant submits own" on public.expert_applications
  for insert to authenticated with check (user_id = auth.uid() and status = 'pending');
grant insert (user_id, full_name, email, phone, location, education, institution, degree, skills, expertise_areas,
              years_experience, portfolio_url, linkedin_url, github_url, resume_path, id_document_path, statement, agreed_to_terms)
  on public.expert_applications to authenticated;

create policy "expert_profiles: approved are visible" on public.expert_profiles
  for select to authenticated using (verification_status = 'approved' or user_id = auth.uid() or public.is_admin());
create policy "expert_profiles: self update" on public.expert_profiles
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
grant update (display_name, headline, bio, is_available, max_active_requests, min_rate, response_time_hours, portfolio_url)
  on public.expert_profiles to authenticated;

create policy "payout accounts: self or admin" on public.expert_payout_accounts
  for select to authenticated using (expert_id = auth.uid() or public.is_admin());
create policy "payout accounts: self insert" on public.expert_payout_accounts
  for insert to authenticated with check (expert_id = auth.uid());
create policy "payout accounts: self update" on public.expert_payout_accounts
  for update to authenticated using (expert_id = auth.uid()) with check (expert_id = auth.uid());
grant insert (expert_id, upi_id, holder_name), update (upi_id, holder_name) on public.expert_payout_accounts to authenticated;

create policy "expert_categories: readable" on public.expert_categories for select to authenticated using (true);
create policy "expert_categories: self manage" on public.expert_categories for all to authenticated
  using (expert_id = auth.uid() or public.is_admin()) with check (expert_id = auth.uid() or public.is_admin());
create policy "expert_skills: readable" on public.expert_skills for select to authenticated using (true);
create policy "expert_skills: self manage" on public.expert_skills for all to authenticated
  using (expert_id = auth.uid() or public.is_admin()) with check (expert_id = auth.uid() or public.is_admin());
grant insert, update, delete on public.expert_categories, public.expert_skills to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Requests and everything under them (read-only to clients except files,
--    messages; all transitions go through RPCs)
-- ---------------------------------------------------------------------------
create policy "requests: participants and offered experts" on public.requests
  for select to authenticated
  using (student_id = auth.uid() or assigned_expert_id = auth.uid() or public.is_admin() or public.has_open_offer(id));

create policy "request_skills: as request" on public.request_skills
  for select to authenticated using (public.can_access_request(request_id) or public.has_open_offer(request_id));
create policy "request_events: participants" on public.request_events
  for select to authenticated using (public.can_access_request(request_id));
create policy "request_offers: expert or admin" on public.request_offers
  for select to authenticated using (expert_id = auth.uid() or public.is_admin());
create policy "milestones: participants" on public.milestones
  for select to authenticated using (public.can_access_request(request_id));

create policy "attachments: participants read" on public.request_attachments
  for select to authenticated using (public.can_access_request(request_id));
create policy "attachments: participants upload" on public.request_attachments
  for insert to authenticated with check (
    uploader_id = auth.uid() and public.can_access_request(request_id)
    and storage_path like request_id::text || '/%'
    and exists (select 1 from public.requests r where r.id = request_id and r.status not in ('cancelled', 'completed')));
create policy "attachments: uploader or admin delete" on public.request_attachments
  for delete to authenticated using (uploader_id = auth.uid() or public.is_admin());
grant insert (request_id, uploader_id, storage_path, file_name, mime_type, size_bytes, message_id), delete
  on public.request_attachments to authenticated;

create policy "messages: participants read" on public.messages
  for select to authenticated using (public.can_access_request(request_id));
create policy "messages: participants send" on public.messages
  for insert to authenticated with check (
    sender_id = auth.uid() and kind in ('text', 'code', 'file', 'image')
    and public.can_access_request(request_id)
    and exists (select 1 from public.requests r where r.id = request_id and r.status <> 'cancelled'));
grant insert (request_id, sender_id, kind, body, code_language, attachment_id) on public.messages to authenticated;

-- ---------------------------------------------------------------------------
-- 7. Money
-- ---------------------------------------------------------------------------
create policy "payments: payer or admin" on public.payments
  for select to authenticated using (student_id = auth.uid() or public.is_admin());
create policy "transactions: own or admin" on public.transactions
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "payouts: expert or admin" on public.payouts
  for select to authenticated using (expert_id = auth.uid() or public.is_admin());
create policy "referrals: referrer or admin" on public.referrals
  for select to authenticated using (referrer_id = auth.uid() or public.is_admin());

create policy "coupons: admin only" on public.coupons
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant insert, update, delete on public.coupons to authenticated;
create policy "coupon_redemptions: own or admin" on public.coupon_redemptions
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- 8. Reviews, disputes, support
-- ---------------------------------------------------------------------------
create policy "reviews: published testimonials are public" on public.reviews
  for select to anon, authenticated using (status = 'published' and allow_public);
create policy "reviews: author, subject expert, admin" on public.reviews
  for select to authenticated using (student_id = auth.uid() or expert_id = auth.uid() or public.is_admin());
create policy "reviews: admin moderates" on public.reviews
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
grant update (status) on public.reviews to authenticated;

create policy "disputes: reporter or admin" on public.disputes
  for select to authenticated using (raised_by = auth.uid() or public.is_admin());
create policy "disputes: admin resolves" on public.disputes
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
grant update (status, resolution, resolved_by, resolved_at) on public.disputes to authenticated;

create policy "tickets: owner or admin" on public.support_tickets
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "tickets: admin manages" on public.support_tickets
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
grant update (status, assigned_to) on public.support_tickets to authenticated;

create policy "ticket messages: owner or admin read" on public.ticket_messages
  for select to authenticated using (
    public.is_admin() or exists (select 1 from public.support_tickets t where t.id = ticket_id and t.user_id = auth.uid()));
create policy "ticket messages: owner or admin reply" on public.ticket_messages
  for insert to authenticated with check (
    sender_id = auth.uid() and (
      (is_staff and public.is_admin())
      or (not is_staff and exists (select 1 from public.support_tickets t where t.id = ticket_id and t.user_id = auth.uid() and t.status <> 'closed'))));
grant insert (ticket_id, sender_id, is_staff, body) on public.ticket_messages to authenticated;
grant usage on sequence public.ticket_messages_id_seq to authenticated;

-- ---------------------------------------------------------------------------
-- 9. Notifications, saved experts, audit
-- ---------------------------------------------------------------------------
create policy "notifications: own" on public.notifications
  for select to authenticated using (user_id = auth.uid());
create policy "notifications: delete own" on public.notifications
  for delete to authenticated using (user_id = auth.uid());
grant delete on public.notifications to authenticated;

create policy "notification prefs: own" on public.notification_preferences
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
grant insert, update on public.notification_preferences to authenticated;

create policy "deliveries: admin read" on public.notification_deliveries
  for select to authenticated using (public.is_admin());

create policy "saved experts: own" on public.saved_experts
  for all to authenticated using (student_id = auth.uid()) with check (student_id = auth.uid());
grant insert, delete on public.saved_experts to authenticated;

create policy "audit: admin read" on public.audit_logs
  for select to authenticated using (public.is_admin());
-- rate_limits: no policies -> inaccessible to clients.

-- Column-level select restriction: only the student should see the tracking key.
revoke select on public.requests from anon, authenticated;
grant select (id, code, student_id, work_type, category_id, title, description, deadline_option, deadline_at,
              budget_option, budget_min, budget_max, is_anonymous, contact_preference, status,
              estimate_min, estimate_max, estimate_days, quoted_price, discount_amount, coupon_id,
              assigned_expert_id, classification, submitted_at, completed_at, updated_at)
  on public.requests to authenticated;

create or replace function public.get_tracking_token(p_request uuid)
returns text language sql stable security definer set search_path = public as $$
  select tracking_token from public.requests where id = p_request and student_id = auth.uid()
$$;
grant execute on function public.get_tracking_token(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 10. Realtime (respects RLS)
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.messages, public.notifications, public.request_events;

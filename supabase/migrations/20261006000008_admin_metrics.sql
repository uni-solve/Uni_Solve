-- =============================================================================
-- UniSolve · 0008 · Admin operations and metrics
-- =============================================================================

-- Students can bookmark experts they've worked with.
create table public.saved_experts (
  student_id  uuid references public.profiles (id) on delete cascade,
  expert_id   uuid references public.expert_profiles (user_id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (student_id, expert_id)
);

-- ---------------------------------------------------------------------------
-- Expert verification: pending -> under_review -> approved | rejected
-- ---------------------------------------------------------------------------
create or replace function public.admin_review_application(p_application uuid, p_status public.verification_status, p_notes text default null)
returns void language plpgsql security definer set search_path = public as $$
declare a public.expert_applications;
begin
  if not public.is_admin() then raise exception 'Admins only' using errcode = '42501'; end if;
  select * into a from public.expert_applications where id = p_application for update;
  if not found then raise exception 'Application not found'; end if;
  if p_status = 'pending' then raise exception 'Choose under_review, approved or rejected'; end if;
  if p_status = 'rejected' and coalesce(trim(p_notes), '') = '' then raise exception 'Give a reason for rejecting'; end if;

  update public.expert_applications set status = p_status, reviewer_id = auth.uid(), reviewer_notes = p_notes, reviewed_at = now()
  where id = p_application;

  if p_status = 'approved' then
    insert into public.expert_profiles (user_id, display_name, education, years_experience, portfolio_url, verification_status, approved_at)
    values (a.user_id,
            coalesce((select display_name from public.profiles where id = a.user_id), split_part(a.full_name, ' ', 1)),
            a.degree || ', ' || a.institution, a.years_experience, a.portfolio_url, 'approved', now())
    on conflict (user_id) do update set verification_status = 'approved', approved_at = now();

    insert into public.expert_categories (expert_id, category_id)
    select a.user_id, unnest(a.expertise_areas) on conflict do nothing;
    insert into public.expert_skills (expert_id, skill_id)
    select a.user_id, s.id from public.skills s where s.slug = any (a.skills) or s.name = any (a.skills)
    on conflict do nothing;

    update public.profiles set role = 'expert' where id = a.user_id and role <> 'admin';
  elsif p_status = 'rejected' then
    update public.expert_profiles set verification_status = 'rejected' where user_id = a.user_id;
  else
    update public.expert_profiles set verification_status = p_status where user_id = a.user_id;
  end if;

  perform public.notify(a.user_id, 'application_update',
    case p_status when 'approved' then 'You''re approved as a UniSolve Expert'
                  when 'rejected' then 'Update on your expert application'
                  else 'Your expert application is under review' end,
    case when p_status = 'rejected' then p_notes end, '/expert/', null);
  perform public.audit('expert_application.' || p_status, 'expert_application', p_application::text, jsonb_build_object('user', a.user_id, 'notes', p_notes));
end $$;

create or replace function public.admin_set_user_role(p_user uuid, p_role public.user_role)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only' using errcode = '42501'; end if;
  if p_user = auth.uid() then raise exception 'You cannot change your own role'; end if;
  update public.profiles set role = p_role where id = p_user;
  if p_role = 'student' then
    insert into public.student_profiles (user_id, referral_code) values (p_user, public.generate_referral_code(null))
    on conflict (user_id) do nothing;
  end if;
  perform public.audit('user.role', 'profile', p_user::text, jsonb_build_object('role', p_role));
end $$;

create or replace function public.admin_set_suspended(p_user uuid, p_suspended boolean, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only' using errcode = '42501'; end if;
  if p_user = auth.uid() then raise exception 'You cannot suspend yourself'; end if;
  update public.profiles set is_suspended = p_suspended where id = p_user;
  perform public.audit(case when p_suspended then 'user.suspend' else 'user.unsuspend' end, 'profile', p_user::text, jsonb_build_object('reason', p_reason));
end $$;

-- ---------------------------------------------------------------------------
-- Refunds: back to UPI (admin sends manually) or as UniSolve credit.
-- ---------------------------------------------------------------------------
create or replace function public.admin_refund_payment(p_payment uuid, p_amount integer, p_as_credit boolean, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare p public.payments; r public.requests; total_paid int;
begin
  if not public.is_admin() then raise exception 'Admins only' using errcode = '42501'; end if;
  select * into p from public.payments where id = p_payment for update;
  if not found or p.status not in ('verified', 'partially_refunded') then raise exception 'Only verified payments can be refunded'; end if;
  total_paid := p.amount + p.credit_applied;
  if p_amount < 1 or p.refunded_amount + p_amount > total_paid then raise exception 'Refund exceeds the amount paid'; end if;
  select * into r from public.requests where id = p.request_id;

  update public.payments set refunded_amount = refunded_amount + p_amount,
         status = case when refunded_amount + p_amount = total_paid then 'refunded'::public.payment_status else 'partially_refunded' end
  where id = p_payment;
  if p.milestone_id is not null and p.refunded_amount + p_amount = total_paid then
    update public.milestones set status = 'refunded' where id = p.milestone_id;
  end if;
  if p_as_credit then
    update public.student_profiles set credit_balance = credit_balance + p_amount * 100 where user_id = p.student_id;
    insert into public.transactions (type, amount, user_id, request_id, payment_id, note) values ('credit_grant', p_amount, p.student_id, r.id, p.id, 'Refund as credit');
  end if;
  insert into public.transactions (type, amount, user_id, request_id, payment_id, note)
  values ('refund', p_amount, p.student_id, r.id, p.id, coalesce(p_reason, 'Refund'));

  perform public.add_request_event(r.id, null, 'Refund of ₹' || p_amount || ' initiated' || case when p_as_credit then ' as UniSolve credit' else ' to your UPI account' end, 'payment');
  perform public.notify(p.student_id, 'refund_initiated', 'Refund initiated for ' || r.code, '₹' || p_amount || case when p_as_credit then ' added as credit.' else ' will reach your UPI account in 5–7 working days.' end, '/dashboard/payments/', r.id);
  perform public.audit('payment.refund', 'payment', p_payment::text, jsonb_build_object('amount', p_amount, 'credit', p_as_credit, 'reason', p_reason));
end $$;

-- ---------------------------------------------------------------------------
-- Expert earnings & payouts
-- ---------------------------------------------------------------------------
create or replace function public.expert_balance(p_expert uuid default auth.uid())
returns jsonb language sql stable security definer set search_path = public as $$
  select case when p_expert = auth.uid() or public.is_admin() then jsonb_build_object(
    'earned', coalesce((select sum(amount) from public.transactions where type = 'expert_earning' and user_id = p_expert), 0),
    'paid_out', coalesce((select sum(amount) from public.payouts where expert_id = p_expert and status = 'paid'), 0),
    'pending_payout', coalesce((select sum(amount) from public.payouts where expert_id = p_expert and status in ('pending', 'processing')), 0),
    'available', coalesce((select sum(amount) from public.transactions where type = 'expert_earning' and user_id = p_expert), 0)
               - coalesce((select sum(amount) from public.payouts where expert_id = p_expert and status <> 'failed'), 0))
  end
$$;

create or replace function public.admin_create_payout(p_expert uuid, p_amount integer)
returns uuid language plpgsql security definer set search_path = public as $$
declare pid uuid; avail int;
begin
  if not public.is_admin() then raise exception 'Admins only' using errcode = '42501'; end if;
  avail := (public.expert_balance(p_expert) ->> 'available')::int;
  if p_amount < 1 or p_amount > avail then raise exception 'Payout exceeds available balance (₹%)', avail; end if;
  insert into public.payouts (expert_id, amount) values (p_expert, p_amount) returning id into pid;
  perform public.audit('payout.create', 'payout', pid::text, jsonb_build_object('expert', p_expert, 'amount', p_amount));
  return pid;
end $$;

create or replace function public.admin_mark_payout(p_payout uuid, p_status public.payout_status, p_reference text default null)
returns void language plpgsql security definer set search_path = public as $$
declare po public.payouts;
begin
  if not public.is_admin() then raise exception 'Admins only' using errcode = '42501'; end if;
  select * into po from public.payouts where id = p_payout for update;
  if po.status = 'paid' then raise exception 'Payout already marked as paid'; end if;
  if p_status = 'paid' and coalesce(trim(p_reference), '') = '' then raise exception 'Add the UPI reference for this payout'; end if;
  update public.payouts set status = p_status, reference = p_reference, processed_by = auth.uid(), processed_at = now() where id = p_payout;
  if p_status = 'paid' then
    insert into public.transactions (type, amount, user_id, payout_id, note) values ('payout', po.amount, po.expert_id, p_payout, 'Payout ' || p_reference);
  end if;
  perform public.audit('payout.' || p_status, 'payout', p_payout::text, jsonb_build_object('reference', p_reference));
end $$;

-- ---------------------------------------------------------------------------
-- Metrics
-- ---------------------------------------------------------------------------
create or replace function public.get_admin_metrics()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare res jsonb;
begin
  if not public.is_admin() then raise exception 'Admins only' using errcode = '42501'; end if;
  with paid as (
    select student_id, request_id, amount + credit_applied as total from public.payments where status in ('verified', 'partially_refunded', 'refunded')
  ), per_request as (select request_id, sum(total) as total from paid group by request_id),
  buyers as (select student_id, count(distinct request_id) as n from paid group by student_id)
  select jsonb_build_object(
    'total_students', (select count(*) from public.profiles where role = 'student'),
    'total_experts', (select count(*) from public.expert_profiles where verification_status = 'approved'),
    'pending_applications', (select count(*) from public.expert_applications where status in ('pending', 'under_review')),
    'active_requests', (select count(*) from public.requests where status in ('submitted', 'reviewing', 'quoted', 'assigned', 'in_progress', 'review', 'disputed')),
    'completed_requests', (select count(*) from public.requests where status = 'completed'),
    'total_requests', (select count(*) from public.requests),
    'revenue', coalesce((select sum(total) from paid), 0),
    'commission', coalesce((select sum(amount) from public.transactions where type = 'commission'), 0),
    'pending_payouts', coalesce((select sum(amount) from public.payouts where status in ('pending', 'processing')), 0),
    'refunds', coalesce((select sum(amount) from public.transactions where type = 'refund'), 0),
    'average_order_value', coalesce((select round(avg(total)) from per_request), 0),
    'conversion_rate', case when (select count(*) from public.requests) = 0 then 0
                       else round(100.0 * (select count(*) from per_request) / (select count(*) from public.requests), 1) end,
    'repeat_customers', (select count(*) from buyers where n > 1),
    'payments_to_verify', (select count(*) from public.payments where status = 'pending_verification'),
    'open_disputes', (select count(*) from public.disputes where status in ('open', 'investigating')),
    'open_tickets', (select count(*) from public.support_tickets where status in ('open', 'awaiting_user'))
  ) into res;
  return res;
end $$;

create or replace function public.get_admin_timeseries(p_days int default 30)
returns table (day date, requests int, completed int, revenue int, signups int)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only' using errcode = '42501'; end if;
  return query
  select d::date,
    (select count(*) from public.requests where submitted_at::date = d::date)::int,
    (select count(*) from public.requests where completed_at::date = d::date)::int,
    coalesce((select sum(amount + credit_applied) from public.payments where status <> 'pending_verification' and status <> 'rejected' and verified_at::date = d::date), 0)::int,
    (select count(*) from public.profiles where created_at::date = d::date)::int
  from generate_series(current_date - (least(p_days, 365) - 1), current_date, interval '1 day') d;
end $$;

create or replace function public.get_student_overview()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'active', (select count(*) from public.requests where student_id = auth.uid() and status not in ('completed', 'cancelled')),
    'completed', (select count(*) from public.requests where student_id = auth.uid() and status = 'completed'),
    'pending_payment', coalesce((select sum(m.amount) from public.milestones m join public.requests r on r.id = m.request_id
                                 where r.student_id = auth.uid() and r.status not in ('cancelled', 'completed') and m.status = 'pending'
                                   and m.position = (select min(position) from public.milestones m2 where m2.request_id = r.id and m2.status = 'pending')), 0),
    'saved_experts', (select count(*) from public.saved_experts where student_id = auth.uid()),
    'credit', coalesce((select credit_balance / 100 from public.student_profiles where user_id = auth.uid()), 0),
    'unread_notifications', (select count(*) from public.notifications where user_id = auth.uid() and read_at is null)
  )
$$;

create or replace function public.get_expert_overview()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'open_offers', (select count(*) from public.request_offers where expert_id = auth.uid() and status = 'open'),
    'active', (select count(*) from public.requests where assigned_expert_id = auth.uid() and status in ('assigned', 'in_progress', 'review')),
    'completed', (select count(*) from public.requests where assigned_expert_id = auth.uid() and status = 'completed'),
    'balance', public.expert_balance(auth.uid()),
    'rating', (select jsonb_build_object('avg', rating_avg, 'count', rating_count) from public.expert_profiles where user_id = auth.uid())
  )
$$;

-- Public landing-page metrics: returned only once real volume exists, so the
-- site never displays tiny or fabricated numbers.
create or replace function public.get_public_stats()
returns jsonb language sql stable security definer set search_path = public as $$
  with s as (
    select (select count(distinct student_id) from public.requests where status = 'completed') as students_helped,
           (select count(*) from public.requests where status = 'completed') as completed,
           (select count(*) from public.expert_profiles where verification_status = 'approved') as experts,
           (select round(avg(rating)::numeric, 1) from public.reviews where status = 'published') as rating
  )
  select case when s.completed >= (select public_stats_threshold from public.platform_settings)
    then jsonb_build_object('students_helped', s.students_helped, 'requests_completed', s.completed,
                            'verified_experts', s.experts, 'average_rating', s.rating)
    else null end
  from s
$$;

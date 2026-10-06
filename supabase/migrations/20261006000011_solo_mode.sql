-- =============================================================================
-- UniSolve · 0011 · Solo mode
-- UniSolve is run by a single operator (the admin) who handles every request.
-- No expert marketplace: expert sign-ups are disabled and the workflow becomes:
--   submitted -> quoted -> (50% advance verified) in_progress -> (admin delivers)
--   review -> (balance paid + student approves) completed
-- Expert tables and functions stay in place, dormant, for a future marketplace.
-- =============================================================================

alter table public.platform_settings add column solo_mode boolean not null default true;

-- 50% advance, 50% on delivery — for every quote.
update public.platform_settings set milestone_split = '{50,50}', milestone_threshold = 0;

-- ---------------------------------------------------------------------------
-- Sign-ups are always students now (role metadata is ignored).
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  name text := nullif(trim(new.raw_user_meta_data ->> 'display_name'), '');
  ref_code text := upper(nullif(trim(new.raw_user_meta_data ->> 'referral_code'), ''));
  referrer uuid;
begin
  insert into public.profiles (id, role, display_name) values (new.id, 'student', left(name, 60));
  select user_id into referrer from public.student_profiles where referral_code = ref_code;
  insert into public.student_profiles (user_id, referral_code, referred_by)
  values (new.id, public.generate_referral_code(coalesce(name, new.email)), referrer);
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Quotes: milestone titles follow the split (2 parts = Advance / On delivery).
-- ---------------------------------------------------------------------------
create or replace function public.admin_set_quote(p_request uuid, p_price integer, p_milestones jsonb default null, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  r public.requests; s public.platform_settings; split smallint[]; i int; amt int; remaining int; titles text[];
begin
  if not public.is_admin() then raise exception 'Admins only' using errcode = '42501'; end if;
  select * into r from public.requests where id = p_request for update;
  if not found then raise exception 'Request not found'; end if;
  if r.status not in ('submitted', 'reviewing', 'quoted') then raise exception 'Quote can only be set before work starts'; end if;
  if exists (select 1 from public.payments where request_id = p_request and status in ('verified', 'pending_verification')) then
    raise exception 'Payments already exist for this request';
  end if;
  if p_price < 1 then raise exception 'Price must be positive'; end if;

  select * into s from public.platform_settings;
  delete from public.milestones where request_id = p_request;

  if p_milestones is not null and jsonb_array_length(p_milestones) > 0 then
    if (select sum((m ->> 'amount')::int) from jsonb_array_elements(p_milestones) m) <> p_price then
      raise exception 'Milestone amounts must add up to the price';
    end if;
    insert into public.milestones (request_id, position, title, amount)
    select p_request, ord, left(m ->> 'title', 120), (m ->> 'amount')::int
    from jsonb_array_elements(p_milestones) with ordinality as x(m, ord);
  elsif p_price >= s.milestone_threshold and array_length(s.milestone_split, 1) > 1 then
    split := s.milestone_split; remaining := p_price;
    titles := case array_length(split, 1) when 2 then array['Advance', 'On delivery'] else array['Start', 'Milestone', 'Final'] end;
    for i in 1 .. array_length(split, 1) loop
      amt := case when i = array_length(split, 1) then remaining else round(p_price * split[i] / 100.0)::int end;
      remaining := remaining - amt;
      insert into public.milestones (request_id, position, title, amount)
      values (p_request, i, coalesce(titles[i], 'Part ' || i) || ' (' || split[i] || '%)', amt);
    end loop;
  else
    insert into public.milestones (request_id, position, title, amount) values (p_request, 1, 'Full payment', p_price);
  end if;

  update public.requests set quoted_price = p_price, discount_amount = 0, coupon_id = null, status = 'quoted' where id = p_request;
  if r.status = 'submitted' then
    perform public.add_request_event(p_request, 'reviewing', 'Requirements reviewed');
  end if;
  perform public.add_request_event(p_request, 'quoted',
    case when r.budget_min is not null and p_price = coalesce(r.budget_max, r.budget_min) then 'Your amount of ₹' || p_price || ' was accepted'
         else 'Quote ready: ₹' || p_price end || coalesce(' — ' || nullif(trim(p_note), ''), ''));
  perform public.notify(r.student_id, 'quote_ready', 'Your quote for ' || r.code || ' is ready',
    'Total ₹' || p_price || '. Pay the advance to get started.', '/dashboard/request/?id=' || r.code, p_request);
  perform public.audit('quote.set', 'request', r.code, jsonb_build_object('price', p_price));
end $$;

-- ---------------------------------------------------------------------------
-- Payment verified: in solo mode the advance starts work immediately, and the
-- balance paid after delivery is held as "delivered" until the student approves.
-- ---------------------------------------------------------------------------
create or replace function public.on_payment_verified(p_payment uuid)
returns void language plpgsql security definer set search_path = public as $$
declare p public.payments; r public.requests; ref public.referrals; reward int; s public.platform_settings; total int;
begin
  select * into p from public.payments where id = p_payment;
  select * into r from public.requests where id = p.request_id;
  select * into s from public.platform_settings;
  total := p.amount + p.credit_applied;

  update public.milestones set status = case when s.solo_mode and r.status = 'review' then 'delivered'::public.milestone_status else 'funded' end
  where id = p.milestone_id;
  insert into public.transactions (type, amount, user_id, request_id, payment_id, note)
  values ('payment', total, p.student_id, r.id, p.id, 'Payment for ' || r.code);

  if r.coupon_id is not null and not exists (select 1 from public.coupon_redemptions where coupon_id = r.coupon_id and request_id = r.id) then
    insert into public.coupon_redemptions (coupon_id, user_id, request_id, amount) values (r.coupon_id, r.student_id, r.id, r.discount_amount);
  end if;

  perform public.add_request_event(r.id, null, 'Payment of ₹' || total || ' confirmed', 'payment');

  if s.solo_mode and r.status in ('quoted', 'assigned') then
    update public.requests set status = 'in_progress' where id = r.id;
    update public.milestones set status = 'in_progress' where id = p.milestone_id;
    perform public.add_request_event(r.id, 'assigned', 'Payment confirmed');
    perform public.add_request_event(r.id, 'in_progress', 'Work started');
  elsif not s.solo_mode and r.status = 'quoted' and r.assigned_expert_id is not null then
    update public.requests set status = 'assigned' where id = r.id;
  end if;

  perform public.notify(r.student_id, 'payment_received', 'Payment confirmed for ' || r.code,
    case when s.solo_mode and r.status = 'review' then '₹' || total || ' received. Review the solution and mark it complete.'
         when s.solo_mode then '₹' || total || ' received. Work has started.'
         else '₹' || total || ' received. Thank you!' end,
    '/dashboard/request/?id=' || r.code, r.id);
  if r.assigned_expert_id is not null then
    perform public.notify(r.assigned_expert_id, 'payment_received', 'Milestone funded on ' || r.code, 'You can start work on the next milestone.', '/expert/work/?id=' || r.code, r.id);
  end if;

  -- Referral reward on the referee's first verified payment.
  select * into ref from public.referrals where referee_id = p.student_id and status = 'pending';
  if found and s.referral_enabled and (select count(*) from public.payments where student_id = p.student_id and status = 'verified') = 1 then
    reward := s.referral_reward;
    update public.student_profiles set credit_balance = credit_balance + reward * 100 where user_id = ref.referrer_id;
    update public.referrals set status = 'rewarded', reward_amount = reward, rewarded_at = now() where id = ref.id;
    insert into public.transactions (type, amount, user_id, note) values ('credit_grant', reward, ref.referrer_id, 'Referral reward');
    perform public.notify(ref.referrer_id, 'referral_reward', 'You earned ₹' || reward || ' credit', 'A friend you referred completed their first payment.', '/dashboard/profile/', null);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Solo delivery workflow
-- ---------------------------------------------------------------------------

-- Admin: the solution is ready (files/explanations are shared in the chat).
create or replace function public.admin_mark_delivered(p_request uuid, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare r public.requests; balance int;
begin
  if not public.is_admin() then raise exception 'Admins only' using errcode = '42501'; end if;
  select * into r from public.requests where id = p_request for update;
  if not found or r.status <> 'in_progress' then raise exception 'Only requests in progress can be delivered'; end if;

  update public.milestones set status = 'delivered', delivered_at = now()
  where request_id = p_request and status in ('funded', 'in_progress', 'revision_requested');
  update public.requests set status = 'review' where id = p_request;
  select coalesce(sum(amount), 0) into balance from public.milestones where request_id = p_request and status = 'pending';

  perform public.add_request_event(p_request, 'review', 'Delivered' || coalesce(': ' || nullif(trim(p_note), ''), ''));
  perform public.notify(r.student_id, 'milestone_completed', 'Your solution for ' || r.code || ' is ready',
    case when balance > 0 then 'Pay the remaining ₹' || balance || ', then review and mark it complete.'
         else 'Review it and mark the request complete, or ask for changes.' end,
    '/dashboard/request/?id=' || r.code, p_request);
  perform public.audit('request.delivered', 'request', r.code, '{}');
end $$;

-- Student: ask for changes after delivery.
create or replace function public.student_request_changes(p_request uuid, p_note text)
returns void language plpgsql security definer set search_path = public as $$
declare r public.requests;
begin
  select * into r from public.requests where id = p_request for update;
  if not found or r.student_id <> auth.uid() then raise exception 'Not your request' using errcode = '42501'; end if;
  if r.status <> 'review' then raise exception 'You can request changes after delivery'; end if;
  if coalesce(trim(p_note), '') = '' then raise exception 'Tell us what needs to change'; end if;
  update public.requests set status = 'in_progress' where id = p_request;
  update public.milestones set status = 'revision_requested' where request_id = p_request and status = 'delivered';
  perform public.add_request_event(p_request, 'in_progress', 'Changes requested: ' || p_note);
  perform public.notify_admins('revision_requested', 'Changes requested on ' || r.code, p_note, '/admin/request/?id=' || r.code, p_request);
end $$;

-- Student (or admin on their behalf): close the request once everything is paid.
create or replace function public.complete_request(p_request uuid)
returns void language plpgsql security definer set search_path = public as $$
declare r public.requests;
begin
  select * into r from public.requests where id = p_request for update;
  if not found or not (r.student_id = auth.uid() or public.is_admin()) then raise exception 'Not your request' using errcode = '42501'; end if;
  if r.status <> 'review' then raise exception 'The request can be completed after delivery'; end if;
  if exists (select 1 from public.milestones where request_id = p_request and status = 'pending') then
    raise exception 'Please pay the remaining balance first';
  end if;
  if exists (select 1 from public.payments where request_id = p_request and status = 'pending_verification') then
    raise exception 'Your last payment is still being verified';
  end if;
  update public.milestones set status = 'approved', approved_at = now() where request_id = p_request and status in ('delivered', 'funded');
  update public.requests set status = 'completed', completed_at = now() where id = p_request;
  perform public.add_request_event(p_request, 'completed', 'Request completed');
  perform public.notify(r.student_id, 'request_completed', r.code || ' is complete', 'How was your experience? Leave a review.', '/dashboard/request/?id=' || r.code, p_request);
  if public.is_admin() then
    perform public.audit('request.complete', 'request', r.code, '{}');
  else
    perform public.notify_admins('request_completed', r.code || ' marked complete by the student', null, '/admin/request/?id=' || r.code, p_request);
  end if;
end $$;

revoke execute on function public.admin_mark_delivered(uuid, text), public.student_request_changes(uuid, text), public.complete_request(uuid) from public, anon;
grant execute on function public.admin_mark_delivered(uuid, text), public.student_request_changes(uuid, text), public.complete_request(uuid) to authenticated;

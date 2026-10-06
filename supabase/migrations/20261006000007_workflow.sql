-- =============================================================================
-- UniSolve · 0007 · Request workflow (trusted server-side logic)
-- All state transitions happen here, inside SECURITY DEFINER functions that
-- check the caller's identity. Clients cannot update workflow columns directly.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Internal: record a timeline event (+ a system message in the chat).
-- ---------------------------------------------------------------------------
create or replace function public.add_request_event(
  p_request uuid, p_status public.request_status, p_message text, p_kind text default 'status')
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.request_events (request_id, status, kind, message, actor_id)
  values (p_request, p_status, p_kind, p_message, auth.uid());
  insert into public.messages (request_id, sender_id, kind, body)
  values (p_request, null, case p_kind when 'payment' then 'payment'::public.message_kind
                                         when 'milestone' then 'milestone'::public.message_kind
                                         else 'system'::public.message_kind end, p_message);
end $$;

create or replace function public.notify_admins(p_type public.notification_type, p_title text, p_body text, p_link text, p_request uuid default null)
returns void language plpgsql security definer set search_path = public as $$
declare a uuid;
begin
  for a in select id from public.profiles where role = 'admin' and not is_suspended loop
    perform public.notify(a, p_type, p_title, p_body, p_link, p_request);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Rule-based classifier. Returns category, matched skills and a confidence.
-- Kept deterministic and explainable; an AI classifier can replace the body
-- later while keeping the same output shape (stored in requests.classification).
-- ---------------------------------------------------------------------------
create or replace function public.classify_request(p_text text, p_work_type text default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  t text := ' ' || regexp_replace(lower(coalesce(p_text, '')), '[^a-z0-9+#.\-]+', ' ', 'g') || ' ';
  default_cat smallint;
  best record;
  total real;
  result jsonb;
begin
  select default_category into default_cat from public.work_types where slug = p_work_type;

  with skill_hits as (
    select s.id, s.slug, s.name, s.category_id,
           (select count(*) from unnest(s.keywords) k where position(k in t) > 0)::real as hits
    from public.skills s
  ), matched as (
    select * from skill_hits where hits > 0
  ), cat_scores as (
    select c.id, c.slug, c.name,
           coalesce((select sum(m.hits) from matched m where m.category_id = c.id), 0)
           + case when c.id = default_cat then (case when p_work_type = 'other' then 0.5 else 1.5 end) else 0 end as score
    from public.categories c where c.is_active
  )
  select jsonb_build_object(
           'category_id', (select id from cat_scores order by score desc, id limit 1),
           'category_slug', (select slug from cat_scores order by score desc, id limit 1),
           'category_name', (select name from cat_scores order by score desc, id limit 1),
           'confidence', round(((select max(score) from cat_scores) / greatest((select sum(score) from cat_scores), 1))::numeric, 2),
           'skills', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'slug', slug, 'name', name, 'score', hits) order by hits desc)
                               from (select * from matched order by hits desc limit 8) top), '[]'::jsonb),
           'method', 'rules-v1')
  into result;
  return result;
end $$;

-- ---------------------------------------------------------------------------
-- Price / timeline estimate shown before submission ("Recommended support +
-- estimated price + expected timeline"). Final price is always confirmed by quote.
-- ---------------------------------------------------------------------------
create or replace function public.estimate_request(
  p_category smallint, p_skill_count int, p_text_length int,
  p_deadline public.deadline_option, p_deadline_at timestamptz default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  cat public.categories;
  mult numeric := 1;
  urgency numeric;
  lo integer; hi integer; days integer;
  custom_days numeric;
begin
  select * into cat from public.categories where id = p_category;
  if not found then raise exception 'Unknown category'; end if;

  mult := 1 + least(greatest(p_skill_count, 0), 5) * 0.15
            + case when p_text_length > 1500 then 0.4 when p_text_length > 600 then 0.2 else 0 end;

  custom_days := extract(epoch from (p_deadline_at - now())) / 86400.0;
  urgency := case p_deadline
    when 'today' then 1.5 when 'tomorrow' then 1.3 when '2_3_days' then 1.15
    when 'this_week' then 1.0 when 'none' then 0.95
    when 'custom' then case when custom_days < 1 then 1.5 when custom_days < 2 then 1.3 when custom_days < 4 then 1.15 else 1.0 end
  end;

  lo := greatest(cat.base_price, (round(cat.base_price * mult * urgency / 50) * 50)::int);
  hi := (round(lo * 2.2 / 50) * 50)::int;
  days := case p_deadline
    when 'today' then 0 when 'tomorrow' then 1 when '2_3_days' then least(cat.typical_days, 3)
    when 'this_week' then least(cat.typical_days, 7)
    when 'custom' then greatest(0, least(cat.typical_days, floor(coalesce(custom_days, cat.typical_days))::int))
    else cat.typical_days end;

  return jsonb_build_object('min', lo, 'max', hi, 'days', days, 'category_base', cat.base_price,
                            'uses_milestones', hi >= (select milestone_threshold from public.platform_settings));
end $$;

-- Preview: classifier + estimate, callable before sign-in.
create or replace function public.preview_request(
  p_work_type text, p_title text, p_description text,
  p_deadline public.deadline_option, p_deadline_at timestamptz default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare c jsonb;
begin
  if char_length(coalesce(p_description, '')) > 8000 then raise exception 'Description too long'; end if;
  c := public.classify_request(coalesce(p_title, '') || ' ' || coalesce(p_description, ''), p_work_type);
  return c || jsonb_build_object('estimate', public.estimate_request(
    (c ->> 'category_id')::smallint, jsonb_array_length(c -> 'skills'),
    char_length(coalesce(p_description, '')), p_deadline, p_deadline_at));
end $$;

-- ---------------------------------------------------------------------------
-- Create request (Post Your Problem). Works for anonymous-session students too.
-- ---------------------------------------------------------------------------
create or replace function public.create_request(
  p_work_type text, p_title text, p_description text,
  p_deadline public.deadline_option, p_deadline_at timestamptz,
  p_budget public.budget_option, p_budget_min integer, p_budget_max integer,
  p_is_anonymous boolean, p_contact public.contact_preference)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  c jsonb; est jsonb; new_code text; attempt int := 0; rid uuid; token text;
begin
  if uid is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  if public.my_role() is distinct from 'student' then
    raise exception 'Only student accounts can post requests' using errcode = '42501';
  end if;
  perform public.enforce_rate_limit('create_request', 5, 3600);

  if p_deadline = 'custom' and (p_deadline_at is null or p_deadline_at < now()) then
    raise exception 'Choose a future deadline';
  end if;
  if p_budget = 'custom' and (p_budget_min is null or p_budget_min < 100) then
    raise exception 'Enter a budget of at least ₹100';
  end if;

  c := public.classify_request(p_title || ' ' || p_description, p_work_type);
  est := public.estimate_request((c ->> 'category_id')::smallint, jsonb_array_length(c -> 'skills'),
                                 char_length(p_description), p_deadline, p_deadline_at);
  loop
    attempt := attempt + 1;
    new_code := 'US-' || public.random_digits(case when attempt > 20 then 6 else 5 end);
    exit when not exists (select 1 from public.requests where code = new_code);
  end loop;

  insert into public.requests (
    code, student_id, work_type, category_id, title, description, deadline_option, deadline_at,
    budget_option, budget_min, budget_max, is_anonymous, contact_preference,
    estimate_min, estimate_max, estimate_days, classification)
  values (
    new_code, uid, p_work_type, (c ->> 'category_id')::smallint, trim(p_title), trim(p_description),
    p_deadline,
    case p_deadline
      when 'custom' then p_deadline_at
      when 'today' then date_trunc('day', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata' + interval '23 hours 59 minutes'
      when 'tomorrow' then date_trunc('day', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata' + interval '1 day 23 hours 59 minutes'
      when '2_3_days' then now() + interval '3 days'
      when 'this_week' then now() + interval '7 days'
      else null end,
    p_budget,
    case p_budget when '500_1000' then 500 when '1000_2500' then 1000 when '2500_5000' then 2500 when '5000_plus' then 5000 when 'custom' then p_budget_min end,
    case p_budget when '500_1000' then 1000 when '1000_2500' then 2500 when '2500_5000' then 5000 when 'custom' then coalesce(p_budget_max, p_budget_min) end,
    coalesce(p_is_anonymous, true), coalesce(p_contact, 'in_app'),
    (est ->> 'min')::int, (est ->> 'max')::int, (est ->> 'days')::int, c)
  returning id, tracking_token into rid, token;

  insert into public.request_skills (request_id, skill_id, score)
  select rid, (s ->> 'id')::int, (s ->> 'score')::real from jsonb_array_elements(c -> 'skills') s;

  perform public.add_request_event(rid, 'submitted', 'Request submitted');
  perform public.notify(uid, 'request_received', 'Request ' || new_code || ' received',
    'We''re reviewing your requirements and will share a quote shortly.', '/dashboard/request/?id=' || new_code, rid);
  perform public.notify_admins('request_received', 'New request ' || new_code, c ->> 'category_name', '/admin/request/?id=' || new_code, rid);

  return jsonb_build_object('id', rid, 'code', new_code, 'tracking_token', token,
                            'classification', c, 'estimate', est);
end $$;

-- Public tracking with Request ID + private tracking key (no sign-in needed).
-- Returns status only — never the description, files or messages.
create or replace function public.track_request(p_code text, p_token text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'code', r.code, 'status', r.status, 'category', c.name, 'submitted_at', r.submitted_at,
    'events', coalesce((select jsonb_agg(jsonb_build_object('status', e.status, 'message', e.message, 'at', e.created_at) order by e.created_at)
                        from public.request_events e where e.request_id = r.id and e.kind = 'status'), '[]'::jsonb))
  from public.requests r join public.categories c on c.id = r.category_id
  where r.code = upper(trim(p_code)) and r.tracking_token = trim(p_token)
$$;

create or replace function public.cancel_request(p_request uuid, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare r public.requests;
begin
  select * into r from public.requests where id = p_request for update;
  if not found or (r.student_id <> auth.uid() and not public.is_admin()) then
    raise exception 'Request not found' using errcode = '42501';
  end if;
  if r.status not in ('submitted', 'reviewing', 'quoted') then
    raise exception 'This request can no longer be cancelled. Please raise a support ticket.';
  end if;
  if exists (select 1 from public.payments where request_id = p_request and status = 'verified') then
    raise exception 'A payment has been verified for this request. Please request a refund instead.';
  end if;
  update public.requests set status = 'cancelled' where id = p_request;
  update public.request_offers set status = 'withdrawn' where request_id = p_request and status = 'open';
  perform public.add_request_event(p_request, 'cancelled', coalesce('Request cancelled: ' || nullif(trim(p_reason), ''), 'Request cancelled'));
end $$;

-- ---------------------------------------------------------------------------
-- Quote (admin): sets the price and creates milestones.
-- p_milestones: optional [{"title": "...", "amount": 1500}, ...]; otherwise the
-- platform split (default 30/40/30) is used above the milestone threshold.
-- ---------------------------------------------------------------------------
create or replace function public.admin_set_quote(p_request uuid, p_price integer, p_milestones jsonb default null, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  r public.requests; s public.platform_settings; split smallint[]; i int; amt int; remaining int; titles text[] := array['Start', 'Milestone', 'Final'];
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
  elsif p_price >= s.milestone_threshold then
    split := s.milestone_split; remaining := p_price;
    for i in 1 .. array_length(split, 1) loop
      amt := case when i = array_length(split, 1) then remaining else round(p_price * split[i] / 100.0)::int end;
      remaining := remaining - amt;
      insert into public.milestones (request_id, position, title, amount)
      values (p_request, i, coalesce(titles[i], 'Milestone ' || i) || ' (' || split[i] || '%)', amt);
    end loop;
  else
    insert into public.milestones (request_id, position, title, amount) values (p_request, 1, 'Full payment', p_price);
  end if;

  update public.requests set quoted_price = p_price, discount_amount = 0, coupon_id = null, status = 'quoted' where id = p_request;
  if r.status = 'submitted' then
    perform public.add_request_event(p_request, 'reviewing', 'Requirements reviewed');
  end if;
  perform public.add_request_event(p_request, 'quoted', 'Quote ready: ₹' || p_price || coalesce(' — ' || nullif(trim(p_note), ''), ''));
  perform public.notify(r.student_id, 'quote_ready', 'Your quote for ' || r.code || ' is ready',
    'Total ₹' || p_price || '. Review and pay to get started.', '/dashboard/request/?id=' || r.code, p_request);
  perform public.audit('quote.set', 'request', r.code, jsonb_build_object('price', p_price));
end $$;

-- Re-spread a total across pending milestones, keeping proportions.
create or replace function public.respread_milestones(p_request uuid, p_total integer)
returns void language plpgsql security definer set search_path = public as $$
declare old_total int; remaining int := p_total; m record; n int; i int := 0; amt int;
begin
  select sum(amount), count(*) into old_total, n from public.milestones where request_id = p_request;
  for m in select id, amount from public.milestones where request_id = p_request order by position loop
    i := i + 1;
    amt := case when i = n then remaining else round(p_total::numeric * m.amount / greatest(old_total, 1))::int end;
    remaining := remaining - amt;
    update public.milestones set amount = amt where id = m.id;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Coupons (student, before first payment)
-- ---------------------------------------------------------------------------
create or replace function public.apply_coupon(p_request uuid, p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.requests; cp public.coupons; disc int; used_total int; used_user int;
begin
  perform public.enforce_rate_limit('apply_coupon', 10, 600);
  select * into r from public.requests where id = p_request for update;
  if not found or r.student_id <> auth.uid() then raise exception 'Request not found' using errcode = '42501'; end if;
  if r.status <> 'quoted' or r.quoted_price is null then raise exception 'Coupons can be applied once your quote is ready'; end if;
  if exists (select 1 from public.payments where request_id = p_request and status in ('verified', 'pending_verification')) then
    raise exception 'Coupons must be applied before paying';
  end if;

  select * into cp from public.coupons where code = upper(trim(p_code)) and is_active;
  if not found or now() < cp.starts_at or (cp.expires_at is not null and now() > cp.expires_at) then
    raise exception 'This coupon is invalid or has expired';
  end if;
  if r.quoted_price < cp.min_order then raise exception 'This coupon needs a minimum order of ₹%', cp.min_order; end if;
  select count(*) into used_total from public.coupon_redemptions where coupon_id = cp.id;
  select count(*) into used_user from public.coupon_redemptions where coupon_id = cp.id and user_id = auth.uid();
  if cp.usage_limit is not null and used_total >= cp.usage_limit then raise exception 'This coupon has reached its usage limit'; end if;
  if used_user >= cp.per_user_limit then raise exception 'You have already used this coupon'; end if;
  if cp.first_order_only and exists (
    select 1 from public.payments where student_id = auth.uid() and status = 'verified') then
    raise exception 'This coupon is only valid on your first order';
  end if;

  disc := case cp.discount_type when 'percent' then round(r.quoted_price * cp.discount_value / 100.0)::int else cp.discount_value end;
  if cp.max_discount is not null then disc := least(disc, cp.max_discount); end if;
  disc := least(disc, r.quoted_price - 1);

  update public.requests set discount_amount = disc, coupon_id = cp.id where id = p_request;
  perform public.respread_milestones(p_request, r.quoted_price - disc);
  return jsonb_build_object('discount', disc, 'total', r.quoted_price - disc);
end $$;

create or replace function public.remove_coupon(p_request uuid)
returns void language plpgsql security definer set search_path = public as $$
declare r public.requests;
begin
  select * into r from public.requests where id = p_request for update;
  if not found or r.student_id <> auth.uid() then raise exception 'Request not found' using errcode = '42501'; end if;
  if exists (select 1 from public.payments where request_id = p_request and status in ('verified', 'pending_verification')) then
    raise exception 'Coupons cannot be changed after paying';
  end if;
  update public.requests set discount_amount = 0, coupon_id = null where id = p_request;
  perform public.respread_milestones(p_request, r.quoted_price);
end $$;

-- ---------------------------------------------------------------------------
-- Payments: student submits UPI reference; admin verifies.
-- ---------------------------------------------------------------------------
create or replace function public.submit_upi_payment(p_milestone uuid, p_utr text, p_proof_path text default null, p_use_credit boolean default false)
returns uuid language plpgsql security definer set search_path = public as $$
declare m public.milestones; r public.requests; pid uuid; credit int := 0; bal int; due int;
begin
  perform public.enforce_rate_limit('submit_payment', 6, 3600);
  select * into m from public.milestones where id = p_milestone;
  if not found then raise exception 'Milestone not found'; end if;
  select * into r from public.requests where id = m.request_id;
  if r.student_id <> auth.uid() then raise exception 'Not your request' using errcode = '42501'; end if;
  if r.status in ('cancelled', 'completed') then raise exception 'This request is closed'; end if;
  if m.status <> 'pending' then raise exception 'This milestone is already paid'; end if;
  if exists (select 1 from public.payments where milestone_id = p_milestone and status = 'pending_verification') then
    raise exception 'A payment for this milestone is already awaiting verification';
  end if;
  if exists (select 1 from public.milestones where request_id = m.request_id and position < m.position and status = 'pending') then
    raise exception 'Please pay earlier milestones first';
  end if;
  if p_proof_path is not null and p_proof_path not like (auth.uid()::text || '/%') then
    raise exception 'Invalid proof file';
  end if;

  due := m.amount;
  if not p_use_credit and coalesce(upper(trim(p_utr)), '') !~ '^[0-9A-Z]{10,22}$' then
    raise exception 'Enter the 12-digit UPI transaction reference (UTR) from your payment app';
  end if;
  if p_use_credit then
    select credit_balance into bal from public.student_profiles where user_id = auth.uid() for update;
    credit := least(coalesce(bal, 0) / 100, due);   -- credit_balance is stored in paise
    if credit > 0 then
      update public.student_profiles set credit_balance = credit_balance - credit * 100 where user_id = auth.uid();
      insert into public.transactions (type, amount, user_id, request_id, note) values ('credit_use', credit, auth.uid(), r.id, 'Credit applied to ' || r.code);
    end if;
  end if;

  if credit >= due then
    -- Fully covered by credit: auto-verified.
    -- provider 'credit' means the whole amount came from credit (already logged as credit_use).
    insert into public.payments (request_id, milestone_id, student_id, amount, credit_applied, provider, status, verified_at)
    values (r.id, m.id, auth.uid(), due, 0, 'credit', 'verified', now()) returning id into pid;
    perform public.on_payment_verified(pid);
  else
    if coalesce(upper(trim(p_utr)), '') !~ '^[0-9A-Z]{10,22}$' then
      raise exception 'Enter the 12-digit UPI transaction reference (UTR) for the remaining ₹%', due - credit;
    end if;
    insert into public.payments (request_id, milestone_id, student_id, amount, credit_applied, provider, provider_ref, proof_path)
    values (r.id, m.id, auth.uid(), due - credit, credit, 'upi_manual', upper(trim(p_utr)), p_proof_path)
    returning id into pid;
    perform public.add_request_event(r.id, null, 'Payment of ₹' || (due - credit) || ' submitted for verification', 'payment');
    perform public.notify_admins('payment_received', 'Verify payment for ' || r.code, '₹' || (due - credit) || ' · UTR ' || upper(trim(p_utr)), '/admin/payments/', r.id);
  end if;
  return pid;
end $$;

-- Internal: everything that happens once money is confirmed.
create or replace function public.on_payment_verified(p_payment uuid)
returns void language plpgsql security definer set search_path = public as $$
declare p public.payments; r public.requests; ref public.referrals; reward int; s public.platform_settings;
begin
  select * into p from public.payments where id = p_payment;
  select * into r from public.requests where id = p.request_id;
  select * into s from public.platform_settings;

  update public.milestones set status = 'funded' where id = p.milestone_id;
  insert into public.transactions (type, amount, user_id, request_id, payment_id, note)
  values ('payment', p.amount + p.credit_applied, p.student_id, r.id, p.id, 'Milestone payment for ' || r.code);

  if r.coupon_id is not null and not exists (select 1 from public.coupon_redemptions where coupon_id = r.coupon_id and request_id = r.id) then
    insert into public.coupon_redemptions (coupon_id, user_id, request_id, amount) values (r.coupon_id, r.student_id, r.id, r.discount_amount);
  end if;

  if r.status = 'quoted' and r.assigned_expert_id is not null then
    update public.requests set status = 'assigned' where id = r.id;
  end if;
  perform public.add_request_event(r.id, null, 'Payment of ₹' || (p.amount + p.credit_applied) || ' confirmed', 'payment');
  perform public.notify(r.student_id, 'payment_received', 'Payment confirmed for ' || r.code, '₹' || (p.amount + p.credit_applied) || ' received. Thank you!', '/dashboard/request/?id=' || r.code, r.id);
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

create or replace function public.admin_review_payment(p_payment uuid, p_approve boolean, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare p public.payments; r public.requests;
begin
  if not public.is_admin() then raise exception 'Admins only' using errcode = '42501'; end if;
  select * into p from public.payments where id = p_payment for update;
  if not found or p.status <> 'pending_verification' then raise exception 'Payment is not awaiting verification'; end if;
  select * into r from public.requests where id = p.request_id;

  if p_approve then
    update public.payments set status = 'verified', verified_by = auth.uid(), verified_at = now() where id = p_payment;
    perform public.on_payment_verified(p_payment);
  else
    if coalesce(trim(p_reason), '') = '' then raise exception 'Give a reason for rejecting'; end if;
    update public.payments set status = 'rejected', rejection_reason = p_reason, verified_by = auth.uid(), verified_at = now() where id = p_payment;
    if p.credit_applied > 0 then  -- return any credit that was held
      update public.student_profiles set credit_balance = credit_balance + p.credit_applied * 100 where user_id = p.student_id;
      insert into public.transactions (type, amount, user_id, request_id, payment_id, note)
      values ('credit_grant', p.credit_applied, p.student_id, r.id, p.id, 'Credit returned: payment not verified');
    end if;
    perform public.add_request_event(r.id, null, 'Payment could not be verified: ' || p_reason, 'payment');
    perform public.notify(p.student_id, 'payment_rejected', 'Payment for ' || r.code || ' not verified', p_reason, '/dashboard/request/?id=' || r.code, r.id);
  end if;
  perform public.audit(case when p_approve then 'payment.verify' else 'payment.reject' end, 'payment', p_payment::text,
                       jsonb_build_object('request', r.code, 'amount', p.amount, 'utr', p.provider_ref, 'reason', p_reason));
end $$;

-- ---------------------------------------------------------------------------
-- Matching (rule-based). Scores approved, available experts for a request.
-- ---------------------------------------------------------------------------
create or replace function public.match_experts(p_request uuid, p_limit int default 10)
returns table (expert_id uuid, display_name text, score real, skill_overlap int, rating numeric, completed int, active_load int)
language sql stable security definer set search_path = public as $$
  with r as (select * from public.requests where id = p_request),
  rs as (select skill_id from public.request_skills where request_id = p_request),
  candidates as (
    select e.user_id, e.display_name, e.rating_avg, e.rating_count, e.completed_count, e.max_active_requests, e.min_rate,
      (select count(*) from public.expert_skills es where es.expert_id = e.user_id and es.skill_id in (select skill_id from rs))::int as overlap,
      exists (select 1 from public.expert_categories ec, r where ec.expert_id = e.user_id and ec.category_id = r.category_id) as cat_match,
      (select count(*) from public.requests x where x.assigned_expert_id = e.user_id and x.status in ('assigned', 'in_progress', 'review'))::int as load
    from public.expert_profiles e join public.profiles p on p.id = e.user_id
    where e.verification_status = 'approved' and e.is_available and not p.is_suspended
  )
  select c.user_id, c.display_name,
    (c.overlap * 10
     + case when c.cat_match then 6 else 0 end
     + case when c.rating_count > 0 then c.rating_avg * 2 else 6 end   -- new experts get a neutral rating
     + ln(1 + c.completed_count) * 2
     - c.load * 2
     - case when c.min_rate is not null and c.min_rate > coalesce((select coalesce(quoted_price, budget_max, estimate_max) from r), 0) then 8 else 0 end
    )::real as score,
    c.overlap, c.rating_avg, c.completed_count, c.load
  from candidates c
  where c.load < c.max_active_requests and (c.overlap > 0 or c.cat_match)
    and (public.is_admin())
  order by score desc
  limit p_limit
$$;

create or replace function public.admin_send_offers(p_request uuid, p_experts uuid[])
returns int language plpgsql security definer set search_path = public as $$
declare r public.requests; e uuid; n int := 0;
begin
  if not public.is_admin() then raise exception 'Admins only' using errcode = '42501'; end if;
  select * into r from public.requests where id = p_request;
  if r.assigned_expert_id is not null then raise exception 'Request already has an expert'; end if;
  foreach e in array p_experts loop
    if public.is_approved_expert(e) then
      insert into public.request_offers (request_id, expert_id) values (p_request, e)
      on conflict (request_id, expert_id) do update set status = 'open', created_at = now(), responded_at = null;
      perform public.notify(e, 'offer_received', 'New request matches your skills', r.title, '/expert/available/', p_request);
      n := n + 1;
    end if;
  end loop;
  perform public.audit('offers.send', 'request', r.code, jsonb_build_object('experts', p_experts));
  return n;
end $$;

-- Internal: assign an expert (used by admin assignment and offer acceptance).
create or replace function public.assign_expert(p_request uuid, p_expert uuid)
returns void language plpgsql security definer set search_path = public as $$
declare r public.requests; funded boolean; ename text;
begin
  select * into r from public.requests where id = p_request for update;
  if r.assigned_expert_id is not null then raise exception 'Request already has an expert'; end if;
  if r.status in ('cancelled', 'completed') then raise exception 'Request is closed'; end if;
  if not public.is_approved_expert(p_expert) then raise exception 'Expert is not approved'; end if;

  funded := exists (select 1 from public.milestones where request_id = p_request and status <> 'pending');
  update public.requests set assigned_expert_id = p_expert,
         status = case when funded then 'assigned'::public.request_status else status end
  where id = p_request;
  update public.request_offers set status = case when expert_id = p_expert then 'accepted'::public.offer_status else 'withdrawn' end,
         responded_at = coalesce(responded_at, now())
  where request_id = p_request and status = 'open';

  select display_name into ename from public.expert_profiles where user_id = p_expert;
  perform public.add_request_event(p_request, 'assigned', 'Expert assigned: ' || ename);
  perform public.notify(r.student_id, 'expert_assigned', 'An expert has been assigned to ' || r.code, ename || ' will be working with you.', '/dashboard/request/?id=' || r.code, p_request);
  perform public.notify(p_expert, 'expert_assigned', 'You''ve been assigned ' || r.code, r.title, '/expert/work/?id=' || r.code, p_request);
end $$;

create or replace function public.admin_assign_expert(p_request uuid, p_expert uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only' using errcode = '42501'; end if;
  perform public.assign_expert(p_request, p_expert);
  perform public.audit('expert.assign', 'request', p_request::text, jsonb_build_object('expert', p_expert));
end $$;

create or replace function public.respond_to_offer(p_offer uuid, p_accept boolean)
returns void language plpgsql security definer set search_path = public as $$
declare o public.request_offers;
begin
  select * into o from public.request_offers where id = p_offer for update;
  if not found or o.expert_id <> auth.uid() then raise exception 'Offer not found' using errcode = '42501'; end if;
  if o.status <> 'open' then raise exception 'This offer is no longer available'; end if;
  if not public.is_approved_expert() then raise exception 'Your expert profile must be approved before accepting work'; end if;
  if p_accept then
    perform public.assign_expert(o.request_id, auth.uid());
  else
    update public.request_offers set status = 'declined', responded_at = now() where id = p_offer;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Delivery: expert starts / delivers; student approves or asks for revision.
-- ---------------------------------------------------------------------------
create or replace function public.expert_start_work(p_request uuid)
returns void language plpgsql security definer set search_path = public as $$
declare r public.requests; m public.milestones;
begin
  select * into r from public.requests where id = p_request for update;
  if not found or r.assigned_expert_id <> auth.uid() then raise exception 'Not your request' using errcode = '42501'; end if;
  select * into m from public.milestones where request_id = p_request and status = 'funded' order by position limit 1;
  if not found then raise exception 'The next milestone has not been funded yet'; end if;
  update public.milestones set status = 'in_progress' where id = m.id;
  if r.status <> 'in_progress' then
    update public.requests set status = 'in_progress' where id = p_request;
    perform public.add_request_event(p_request, 'in_progress', 'Work started');
  else
    perform public.add_request_event(p_request, null, 'Started: ' || m.title, 'milestone');
  end if;
end $$;

create or replace function public.expert_deliver_milestone(p_milestone uuid, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare m public.milestones; r public.requests; is_last boolean;
begin
  select * into m from public.milestones where id = p_milestone for update;
  select * into r from public.requests where id = m.request_id;
  if r.assigned_expert_id <> auth.uid() then raise exception 'Not your request' using errcode = '42501'; end if;
  if m.status not in ('in_progress', 'revision_requested', 'funded') then raise exception 'This milestone can''t be delivered right now'; end if;
  update public.milestones set status = 'delivered', delivered_at = now() where id = p_milestone;
  is_last := not exists (select 1 from public.milestones where request_id = r.id and position > m.position);
  if is_last then
    update public.requests set status = 'review' where id = r.id;
    perform public.add_request_event(r.id, 'review', 'Delivered for your review' || coalesce(': ' || nullif(trim(p_note), ''), ''));
  else
    perform public.add_request_event(r.id, null, m.title || ' delivered' || coalesce(': ' || nullif(trim(p_note), ''), ''), 'milestone');
  end if;
  perform public.notify(r.student_id, 'milestone_completed', m.title || ' delivered on ' || r.code, 'Review it and approve, or ask for changes.', '/dashboard/request/?id=' || r.code, r.id);
end $$;

create or replace function public.student_review_milestone(p_milestone uuid, p_approve boolean, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare m public.milestones; r public.requests; s public.platform_settings; commission int; all_done boolean;
begin
  select * into m from public.milestones where id = p_milestone for update;
  select * into r from public.requests where id = m.request_id;
  if r.student_id <> auth.uid() then raise exception 'Not your request' using errcode = '42501'; end if;
  if m.status <> 'delivered' then raise exception 'This milestone hasn''t been delivered yet'; end if;

  if not p_approve then
    if coalesce(trim(p_note), '') = '' then raise exception 'Tell your expert what needs to change'; end if;
    update public.milestones set status = 'revision_requested' where id = p_milestone;
    if r.status = 'review' then update public.requests set status = 'in_progress' where id = r.id; end if;
    perform public.add_request_event(r.id, null, 'Revision requested: ' || p_note, 'milestone');
    perform public.notify(r.assigned_expert_id, 'revision_requested', 'Revision requested on ' || r.code, p_note, '/expert/work/?id=' || r.code, r.id);
    return;
  end if;

  select * into s from public.platform_settings;
  update public.milestones set status = 'approved', approved_at = now() where id = p_milestone;
  commission := round(m.amount * s.commission_percent / 100.0)::int;
  insert into public.transactions (type, amount, user_id, request_id, note) values
    ('commission', commission, null, r.id, 'Platform commission · ' || m.title),
    ('expert_earning', m.amount - commission, r.assigned_expert_id, r.id, 'Earning · ' || r.code || ' · ' || m.title);
  perform public.add_request_event(r.id, null, m.title || ' approved', 'milestone');

  all_done := not exists (select 1 from public.milestones where request_id = r.id and status <> 'approved');
  if all_done then
    update public.requests set status = 'completed', completed_at = now() where id = r.id;
    update public.expert_profiles set completed_count = completed_count + 1 where user_id = r.assigned_expert_id;
    perform public.add_request_event(r.id, 'completed', 'Request completed');
    perform public.notify(r.student_id, 'request_completed', r.code || ' is complete', 'How was your experience? Leave a review.', '/dashboard/request/?id=' || r.code, r.id);
    perform public.notify(r.assigned_expert_id, 'request_completed', r.code || ' completed', 'Earnings have been added to your balance.', '/expert/earnings/', r.id);
  else
    perform public.notify(r.assigned_expert_id, 'milestone_completed', m.title || ' approved on ' || r.code, 'Earnings added to your balance.', '/expert/work/?id=' || r.code, r.id);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Reviews, disputes, tickets
-- ---------------------------------------------------------------------------
create or replace function public.submit_review(p_request uuid, p_rating int, p_comment text, p_allow_public boolean default true)
returns void language plpgsql security definer set search_path = public as $$
declare r public.requests;
begin
  select * into r from public.requests where id = p_request;
  if not found or r.student_id <> auth.uid() then raise exception 'Not your request' using errcode = '42501'; end if;
  if r.status <> 'completed' then raise exception 'You can review once the request is completed'; end if;
  insert into public.reviews (request_id, student_id, expert_id, rating, comment, allow_public)
  values (p_request, auth.uid(), r.assigned_expert_id, p_rating, nullif(trim(p_comment), ''), coalesce(p_allow_public, true));
end $$;

create or replace function public.raise_dispute(p_request uuid, p_reason text, p_details text)
returns uuid language plpgsql security definer set search_path = public as $$
declare r public.requests; did uuid;
begin
  perform public.enforce_rate_limit('raise_dispute', 3, 3600);
  select * into r from public.requests where id = p_request;
  if not found or not (r.student_id = auth.uid() or r.assigned_expert_id = auth.uid()) then
    raise exception 'Request not found' using errcode = '42501';
  end if;
  insert into public.disputes (request_id, raised_by, reason, details) values (p_request, auth.uid(), p_reason, p_details) returning id into did;
  perform public.add_request_event(p_request, null, 'An issue was reported. UniSolve support is reviewing it.', 'note');
  perform public.notify_admins('ticket_update', 'Issue reported on ' || r.code, p_reason, '/admin/disputes/', p_request);
  return did;
end $$;

create or replace function public.create_support_ticket(p_topic text, p_subject text, p_body text, p_request uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare tcode text; tid uuid;
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  perform public.enforce_rate_limit('create_ticket', 5, 3600);
  if p_request is not null and not public.can_access_request(p_request) then raise exception 'Request not found' using errcode = '42501'; end if;
  loop
    tcode := 'SUP-' || public.random_digits(5);
    exit when not exists (select 1 from public.support_tickets where code = tcode);
  end loop;
  insert into public.support_tickets (code, user_id, topic, subject, request_id) values (tcode, auth.uid(), p_topic, trim(p_subject), p_request) returning id into tid;
  insert into public.ticket_messages (ticket_id, sender_id, body) values (tid, auth.uid(), trim(p_body));
  perform public.notify_admins('ticket_update', 'New ticket ' || tcode, p_subject, '/admin/support/', null);
  return jsonb_build_object('id', tid, 'code', tcode);
end $$;

-- ---------------------------------------------------------------------------
-- Message side-effects: rate limit + notify the other participant(s).
-- ---------------------------------------------------------------------------
create or replace function public.on_message_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare r public.requests; recipient uuid;
begin
  if new.sender_id is null then return new; end if;  -- system messages
  perform public.enforce_rate_limit('message', 30, 60);
  select * into r from public.requests where id = new.request_id;
  recipient := case when new.sender_id = r.student_id then r.assigned_expert_id else r.student_id end;
  if recipient is not null and not exists (
    select 1 from public.notifications where user_id = recipient and request_id = r.id and type = 'new_message'
      and read_at is null and created_at > now() - interval '15 minutes') then
    perform public.notify(recipient, 'new_message', 'New message on ' || r.code, left(coalesce(new.body, 'Attachment'), 140),
      case when recipient = r.student_id then '/dashboard/request/?id=' else '/expert/work/?id=' end || r.code, r.id);
  end if;
  return new;
end $$;
create trigger messages_before_insert before insert on public.messages
  for each row execute function public.on_message_insert();

create or replace function public.mark_notifications_read(p_ids uuid[] default null)
returns void language sql security definer set search_path = public as $$
  update public.notifications set read_at = now()
  where user_id = auth.uid() and read_at is null and (p_ids is null or id = any (p_ids))
$$;

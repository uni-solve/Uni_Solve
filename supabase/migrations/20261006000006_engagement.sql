-- =============================================================================
-- UniSolve · 0006 · Reviews, disputes, support, notifications, audit log
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Reviews: one per completed request, written by its student. Always "verified"
-- because they can only exist for a real, completed request.
-- ---------------------------------------------------------------------------
create type public.moderation_status as enum ('pending', 'published', 'hidden');
create table public.reviews (
  id            uuid primary key default gen_random_uuid(),
  request_id    uuid not null unique references public.requests (id) on delete cascade,
  student_id    uuid not null references public.profiles (id) on delete cascade,
  expert_id     uuid references public.expert_profiles (user_id) on delete set null,
  rating        smallint not null check (rating between 1 and 5),
  comment       text check (char_length(comment) <= 1500),
  allow_public  boolean not null default true,   -- student consents to show it as a testimonial
  status        public.moderation_status not null default 'pending',
  created_at    timestamptz not null default now()
);
create index reviews_expert_idx on public.reviews (expert_id, created_at desc);
create index reviews_public_idx on public.reviews (status, created_at desc) where allow_public;

-- Keep expert rating aggregates in sync.
create or replace function public.refresh_expert_rating()
returns trigger language plpgsql security definer set search_path = public as $$
declare eid uuid := coalesce(new.expert_id, old.expert_id);
begin
  if eid is not null then
    update public.expert_profiles e set
      rating_avg = coalesce((select round(avg(rating)::numeric, 2) from public.reviews where expert_id = eid and status <> 'hidden'), 0),
      rating_count = (select count(*) from public.reviews where expert_id = eid and status <> 'hidden')
    where e.user_id = eid;
  end if;
  return null;
end $$;
create trigger reviews_rating after insert or update or delete on public.reviews
  for each row execute function public.refresh_expert_rating();

-- ---------------------------------------------------------------------------
-- Disputes ("Report Issue" on a request)
-- ---------------------------------------------------------------------------
create type public.dispute_status as enum ('open', 'investigating', 'resolved_refund', 'resolved_no_refund', 'closed');
create table public.disputes (
  id            uuid primary key default gen_random_uuid(),
  request_id    uuid not null references public.requests (id) on delete cascade,
  raised_by     uuid not null references public.profiles (id) on delete cascade,
  reason        text not null check (reason in ('quality', 'unresponsive', 'deadline', 'integrity', 'payment', 'conduct', 'other')),
  details       text not null check (char_length(details) between 10 and 4000),
  status        public.dispute_status not null default 'open',
  resolution    text,
  resolved_by   uuid references public.profiles (id),
  resolved_at   timestamptz,
  created_at    timestamptz not null default now()
);
create index disputes_status_idx on public.disputes (status, created_at desc);
create index disputes_request_idx on public.disputes (request_id);

-- ---------------------------------------------------------------------------
-- Support tickets (SUP-10291)
-- ---------------------------------------------------------------------------
create type public.ticket_status as enum ('open', 'awaiting_user', 'resolved', 'closed');
create table public.support_tickets (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  topic         text not null check (topic in ('chat', 'payment', 'expert', 'refund', 'technical', 'other')),
  subject       text not null check (char_length(subject) between 3 and 140),
  request_id    uuid references public.requests (id) on delete set null,
  status        public.ticket_status not null default 'open',
  assigned_to   uuid references public.profiles (id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index support_tickets_user_idx on public.support_tickets (user_id, created_at desc);
create index support_tickets_status_idx on public.support_tickets (status, created_at desc);
create trigger support_tickets_touch before update on public.support_tickets
  for each row execute function public.touch_updated_at();

create table public.ticket_messages (
  id          bigserial primary key,
  ticket_id   uuid not null references public.support_tickets (id) on delete cascade,
  sender_id   uuid references public.profiles (id) on delete set null,
  is_staff    boolean not null default false,
  body        text not null check (char_length(body) between 1 and 5000),
  created_at  timestamptz not null default now()
);
create index ticket_messages_ticket_idx on public.ticket_messages (ticket_id, created_at);

-- ---------------------------------------------------------------------------
-- Notifications. In-app rows are the source of truth; notification_deliveries
-- is an outbox that a future Edge Function drains to email / WhatsApp / SMS.
-- ---------------------------------------------------------------------------
create type public.notification_type as enum (
  'request_received', 'quote_ready', 'expert_assigned', 'new_message', 'payment_received',
  'payment_rejected', 'milestone_completed', 'revision_requested', 'request_completed',
  'refund_initiated', 'offer_received', 'application_update', 'ticket_update', 'referral_reward'
);
create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  type        public.notification_type not null,
  title       text not null,
  body        text,
  link        text,
  request_id  uuid references public.requests (id) on delete cascade,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;

create table public.notification_preferences (
  user_id      uuid primary key references public.profiles (id) on delete cascade,
  email        boolean not null default true,
  whatsapp     boolean not null default false,
  sms          boolean not null default false,
  updated_at   timestamptz not null default now()
);

create type public.delivery_channel as enum ('email', 'whatsapp', 'sms');
create type public.delivery_status as enum ('queued', 'sent', 'failed', 'skipped');
create table public.notification_deliveries (
  id               bigserial primary key,
  notification_id  uuid not null references public.notifications (id) on delete cascade,
  channel          public.delivery_channel not null,
  status           public.delivery_status not null default 'queued',
  attempts         smallint not null default 0,
  last_error       text,
  created_at       timestamptz not null default now(),
  sent_at          timestamptz
);
create index notification_deliveries_queue_idx on public.notification_deliveries (status, created_at) where status = 'queued';

-- Single entry point used by every trigger / RPC that notifies someone.
create or replace function public.notify(
  p_user uuid, p_type public.notification_type, p_title text,
  p_body text default null, p_link text default null, p_request uuid default null)
returns void language plpgsql security definer set search_path = public as $$
declare nid uuid; prefs public.notification_preferences;
begin
  if p_user is null then return; end if;
  insert into public.notifications (user_id, type, title, body, link, request_id)
  values (p_user, p_type, p_title, p_body, p_link, p_request)
  returning id into nid;

  select * into prefs from public.notification_preferences where user_id = p_user;
  if coalesce(prefs.email, true) and p_type <> 'new_message' then
    insert into public.notification_deliveries (notification_id, channel) values (nid, 'email');
  end if;
  if coalesce(prefs.whatsapp, false) then
    insert into public.notification_deliveries (notification_id, channel) values (nid, 'whatsapp');
  end if;
end $$;
revoke execute on function public.notify from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Audit log: append-only record of privileged and money-related actions.
-- ---------------------------------------------------------------------------
create table public.audit_logs (
  id           bigserial primary key,
  actor_id     uuid references public.profiles (id) on delete set null,
  action       text not null,
  entity_type  text not null,
  entity_id    text,
  details      jsonb not null default '{}',
  created_at   timestamptz not null default now()
);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);
create index audit_logs_created_idx on public.audit_logs (created_at desc);

create or replace function public.audit(p_action text, p_entity_type text, p_entity_id text, p_details jsonb default '{}')
returns void language sql security definer set search_path = public as $$
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, details)
  values (auth.uid(), p_action, p_entity_type, p_entity_id, coalesce(p_details, '{}'))
$$;
revoke execute on function public.audit from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Rate limiting for write-heavy RPCs: raises when a user exceeds `max_count`
-- actions of `bucket` within `window_seconds`.
-- ---------------------------------------------------------------------------
create table public.rate_limits (
  user_id     uuid not null,
  bucket      text not null,
  created_at  timestamptz not null default now()
);
create index rate_limits_lookup_idx on public.rate_limits (user_id, bucket, created_at desc);

create or replace function public.enforce_rate_limit(p_bucket text, p_max int, p_window_seconds int)
returns void language plpgsql security definer set search_path = public as $$
declare n int;
begin
  select count(*) into n from public.rate_limits
  where user_id = auth.uid() and bucket = p_bucket and created_at > now() - make_interval(secs => p_window_seconds);
  if n >= p_max then
    raise exception 'Too many requests. Please wait a moment and try again.' using errcode = 'P0429';
  end if;
  insert into public.rate_limits (user_id, bucket) values (auth.uid(), p_bucket);
  -- Opportunistic cleanup keeps the table small.
  delete from public.rate_limits where created_at < now() - interval '1 day';
end $$;
revoke execute on function public.enforce_rate_limit from public, anon, authenticated;

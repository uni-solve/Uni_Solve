-- =============================================================================
-- UniSolve · 0004 · Requests, milestones, files and messages
-- =============================================================================

create type public.request_status as enum (
  'submitted',          -- student posted it
  'reviewing',          -- UniSolve reviewing requirements
  'quoted',             -- price + milestones proposed, awaiting student payment
  'assigned',           -- first payment verified and expert assigned
  'in_progress',
  'review',             -- delivered, student reviewing
  'completed',
  'cancelled',
  'disputed'
);

create type public.deadline_option as enum ('today', 'tomorrow', '2_3_days', 'this_week', 'none', 'custom');
create type public.budget_option as enum ('suggest', '500_1000', '1000_2500', '2500_5000', '5000_plus', 'custom');
create type public.contact_preference as enum ('in_app', 'email', 'whatsapp');

create table public.requests (
  id                  uuid primary key default gen_random_uuid(),
  code                text not null unique,                 -- US-48291
  student_id          uuid not null references public.profiles (id) on delete restrict,
  work_type           text not null references public.work_types (slug),
  category_id         smallint not null references public.categories (id),
  title               text not null check (char_length(title) between 3 and 140),
  description         text not null check (char_length(description) between 20 and 8000),
  deadline_option     public.deadline_option not null,
  deadline_at         timestamptz,
  budget_option       public.budget_option not null default 'suggest',
  budget_min          integer check (budget_min >= 0),
  budget_max          integer check (budget_max >= budget_min),
  is_anonymous        boolean not null default true,
  contact_preference  public.contact_preference not null default 'in_app',
  status              public.request_status not null default 'submitted',
  -- Estimate shown to the student at submission time (rule-based classifier).
  estimate_min        integer,
  estimate_max        integer,
  estimate_days       smallint,
  -- Final quote set by UniSolve.
  quoted_price        integer check (quoted_price >= 0),
  discount_amount     integer not null default 0 check (discount_amount >= 0),
  coupon_id           uuid,
  assigned_expert_id  uuid references public.expert_profiles (user_id) on delete set null,
  tracking_token      text not null default encode(extensions.gen_random_bytes(12), 'hex'),
  classification      jsonb not null default '{}',          -- classifier output, for audits / future AI
  submitted_at        timestamptz not null default now(),
  completed_at        timestamptz,
  updated_at          timestamptz not null default now()
);
create index requests_student_idx on public.requests (student_id, submitted_at desc);
create index requests_expert_idx on public.requests (assigned_expert_id, status);
create index requests_status_idx on public.requests (status, submitted_at desc);
create index requests_category_idx on public.requests (category_id);
create trigger requests_touch before update on public.requests
  for each row execute function public.touch_updated_at();

create table public.request_skills (
  request_id  uuid references public.requests (id) on delete cascade,
  skill_id    integer references public.skills (id) on delete cascade,
  score       real not null default 1,
  primary key (request_id, skill_id)
);
create index request_skills_skill_idx on public.request_skills (skill_id);

-- Timeline entries ("Request Submitted", "Expert Assigned", ...).
create table public.request_events (
  id          bigserial primary key,
  request_id  uuid not null references public.requests (id) on delete cascade,
  status      public.request_status,
  kind        text not null default 'status',   -- status | note | payment | milestone
  message     text,
  actor_id    uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index request_events_request_idx on public.request_events (request_id, created_at);

-- Offers: how unassigned requests reach matched experts ("Available Requests").
create type public.offer_status as enum ('open', 'accepted', 'declined', 'expired', 'withdrawn');
create table public.request_offers (
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid not null references public.requests (id) on delete cascade,
  expert_id   uuid not null references public.expert_profiles (user_id) on delete cascade,
  match_score real,
  status      public.offer_status not null default 'open',
  created_at  timestamptz not null default now(),
  responded_at timestamptz,
  unique (request_id, expert_id)
);
create index request_offers_expert_idx on public.request_offers (expert_id, status);

create type public.milestone_status as enum ('pending', 'funded', 'in_progress', 'delivered', 'revision_requested', 'approved', 'refunded');
create table public.milestones (
  id            uuid primary key default gen_random_uuid(),
  request_id    uuid not null references public.requests (id) on delete cascade,
  position      smallint not null,
  title         text not null,
  amount        integer not null check (amount >= 0),     -- rupees
  status        public.milestone_status not null default 'pending',
  due_at        timestamptz,
  delivered_at  timestamptz,
  approved_at   timestamptz,
  created_at    timestamptz not null default now(),
  unique (request_id, position)
);
create index milestones_request_idx on public.milestones (request_id, position);

-- Files: objects live in the private 'request-files' bucket at {request_id}/{uuid}-{name}.
create table public.request_attachments (
  id            uuid primary key default gen_random_uuid(),
  request_id    uuid not null references public.requests (id) on delete cascade,
  uploader_id   uuid not null references public.profiles (id) on delete cascade,
  storage_path  text not null unique,
  file_name     text not null,
  mime_type     text not null,
  size_bytes    integer not null check (size_bytes > 0 and size_bytes <= 26214400),
  message_id    uuid,
  created_at    timestamptz not null default now()
);
create index request_attachments_request_idx on public.request_attachments (request_id, created_at desc);

create type public.message_kind as enum ('text', 'code', 'file', 'image', 'system', 'payment', 'milestone');
create table public.messages (
  id           uuid primary key default gen_random_uuid(),
  request_id   uuid not null references public.requests (id) on delete cascade,
  sender_id    uuid references public.profiles (id) on delete set null,  -- null for system
  kind         public.message_kind not null default 'text',
  body         text check (char_length(body) <= 10000),
  code_language text,
  attachment_id uuid references public.request_attachments (id) on delete set null,
  created_at   timestamptz not null default now(),
  read_at      timestamptz
);
create index messages_request_idx on public.messages (request_id, created_at);

alter table public.request_attachments
  add constraint request_attachments_message_fk foreign key (message_id) references public.messages (id) on delete set null;

-- ---------------------------------------------------------------------------
-- Access helpers
-- ---------------------------------------------------------------------------
create or replace function public.is_request_student(rid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.requests where id = rid and student_id = auth.uid())
$$;

create or replace function public.is_request_expert(rid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.requests where id = rid and assigned_expert_id = auth.uid())
$$;

-- Participants: the owning student, the assigned expert, or an admin.
create or replace function public.can_access_request(rid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin() or public.is_request_student(rid) or public.is_request_expert(rid)
$$;

create or replace function public.has_open_offer(rid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.request_offers
    where request_id = rid and expert_id = auth.uid() and status = 'open'
  ) and public.is_approved_expert()
$$;

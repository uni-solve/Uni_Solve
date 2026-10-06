-- =============================================================================
-- UniSolve · 0003 · Experts and verification
-- Real identity is collected in expert_applications (admin-only + applicant).
-- Students only ever see expert_profiles (display name, skills, rating).
-- =============================================================================

create type public.verification_status as enum ('pending', 'under_review', 'approved', 'rejected');

create table public.expert_applications (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.profiles (id) on delete cascade,
  full_name           text not null check (char_length(full_name) between 2 and 120),
  email               text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone               text not null check (phone ~ '^\+?[0-9]{10,15}$'),
  location            text not null,
  education           text not null,
  institution         text not null,
  degree              text not null,
  skills              text[] not null default '{}',
  expertise_areas     smallint[] not null default '{}',   -- category ids
  years_experience    smallint not null check (years_experience between 0 and 60),
  portfolio_url       text check (portfolio_url ~* '^https?://'),
  linkedin_url        text check (linkedin_url ~* '^https?://'),
  github_url          text check (github_url ~* '^https?://'),
  resume_path         text,          -- private bucket 'expert-docs'
  id_document_path    text,          -- private bucket 'expert-docs'
  statement           text check (char_length(statement) <= 2000),
  agreed_to_terms     boolean not null check (agreed_to_terms),
  status              public.verification_status not null default 'pending',
  reviewer_id         uuid references public.profiles (id),
  reviewer_notes      text,
  reviewed_at         timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index expert_applications_status_idx on public.expert_applications (status, created_at desc);
create unique index expert_applications_one_open_idx
  on public.expert_applications (user_id) where status in ('pending', 'under_review');
create trigger expert_applications_touch before update on public.expert_applications
  for each row execute function public.touch_updated_at();

create table public.expert_profiles (
  user_id               uuid primary key references public.profiles (id) on delete cascade,
  display_name          text not null check (char_length(display_name) between 2 and 60),
  headline              text check (char_length(headline) <= 120),
  bio                   text check (char_length(bio) <= 2000),
  education             text,
  years_experience      smallint not null default 0,
  portfolio_url         text,
  verification_status   public.verification_status not null default 'pending',
  is_available          boolean not null default true,
  max_active_requests   smallint not null default 5,
  min_rate              integer,                      -- rupees; optional floor used by matching
  response_time_hours   smallint not null default 12,
  rating_avg            numeric(3,2) not null default 0,
  rating_count          integer not null default 0,
  completed_count       integer not null default 0,
  approved_at           timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index expert_profiles_matchable_idx
  on public.expert_profiles (verification_status, is_available, rating_avg desc);
create trigger expert_profiles_touch before update on public.expert_profiles
  for each row execute function public.touch_updated_at();

-- Private payout details, kept out of the student-readable profile table.
create table public.expert_payout_accounts (
  expert_id   uuid primary key references public.expert_profiles (user_id) on delete cascade,
  upi_id      text not null check (upi_id ~ '^[a-zA-Z0-9._-]{2,256}@[a-zA-Z]{2,64}$'),
  holder_name text not null,
  updated_at  timestamptz not null default now()
);

create table public.expert_categories (
  expert_id    uuid references public.expert_profiles (user_id) on delete cascade,
  category_id  smallint references public.categories (id) on delete cascade,
  primary key (expert_id, category_id)
);
create index expert_categories_category_idx on public.expert_categories (category_id);

create table public.expert_skills (
  expert_id    uuid references public.expert_profiles (user_id) on delete cascade,
  skill_id     integer references public.skills (id) on delete cascade,
  level        smallint not null default 3 check (level between 1 and 5),
  primary key (expert_id, skill_id)
);
create index expert_skills_skill_idx on public.expert_skills (skill_id);

-- Experts can only take paid work once approved and not suspended.
create or replace function public.is_approved_expert(uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.expert_profiles e
    join public.profiles p on p.id = e.user_id
    where e.user_id = uid and e.verification_status = 'approved' and not p.is_suspended
  )
$$;

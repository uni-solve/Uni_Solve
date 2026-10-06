-- =============================================================================
-- UniSolve · 0001 · Core identity
-- Users live in auth.users (managed by Supabase Auth; passwords are bcrypt-hashed
-- there and never stored by us). Everything app-specific hangs off public.profiles.
-- =============================================================================

create extension if not exists pg_trgm with schema extensions;

create type public.user_role as enum ('student', 'expert', 'admin');

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user. Holds only non-sensitive, displayable data.
-- Email stays in auth.users; phone lives in role-specific private tables.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  role          public.user_role not null default 'student',
  display_name  text check (char_length(display_name) between 1 and 60),
  avatar_path   text,
  is_suspended  boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index profiles_role_idx on public.profiles (role);

-- ---------------------------------------------------------------------------
-- student_profiles: private details for students. Only the student and admins
-- can read it — experts never see these columns.
-- ---------------------------------------------------------------------------
create table public.student_profiles (
  user_id             uuid primary key references public.profiles (id) on delete cascade,
  referral_code       text not null unique,
  referred_by         uuid references public.profiles (id) on delete set null,
  credit_balance      integer not null default 0 check (credit_balance >= 0), -- in paise
  phone               text check (phone ~ '^\+?[0-9]{10,15}$'),
  institution         text, -- optional, never required
  level               text check (level in ('undergraduate', 'postgraduate', 'phd', 'diploma', 'other')),
  default_anonymous   boolean not null default true,
  created_at          timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Helpers used by RLS policies. SECURITY DEFINER so they can read profiles
-- without recursing into profiles' own policies.
-- ---------------------------------------------------------------------------
create or replace function public.my_role()
returns public.user_role
language sql stable security definer set search_path = public
as $$
  select role from public.profiles where id = auth.uid() and not is_suspended
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid() and not is_suspended), false)
$$;

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Random human-friendly codes (US-48291, SUP-10291, UNI-ROS123).
-- ---------------------------------------------------------------------------
create or replace function public.random_digits(n int)
returns text language sql volatile as $$
  select lpad((floor(random() * power(10, n)))::bigint::text, n, '0')
$$;

create or replace function public.generate_referral_code(name_hint text)
returns text language plpgsql volatile set search_path = public as $$
declare
  prefix text := upper(left(regexp_replace(coalesce(name_hint, ''), '[^A-Za-z]', '', 'g') || 'UNI', 3));
  candidate text;
begin
  loop
    candidate := 'UNI-' || prefix || public.random_digits(3);
    exit when not exists (select 1 from public.student_profiles where referral_code = candidate);
  end loop;
  return candidate;
end $$;

-- ---------------------------------------------------------------------------
-- New auth user -> profile (+ student profile). Signup metadata may request the
-- 'expert' role, which only marks intent: experts can't take paid work until an
-- admin approves their application. 'admin' can never be self-assigned.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  requested text := new.raw_user_meta_data ->> 'role';
  name text := nullif(trim(new.raw_user_meta_data ->> 'display_name'), '');
  ref_code text := upper(nullif(trim(new.raw_user_meta_data ->> 'referral_code'), ''));
  referrer uuid;
begin
  insert into public.profiles (id, role, display_name)
  values (new.id, case when requested = 'expert' then 'expert'::public.user_role else 'student' end, left(name, 60));

  if coalesce(requested, 'student') <> 'expert' then
    select user_id into referrer from public.student_profiles where referral_code = ref_code;
    insert into public.student_profiles (user_id, referral_code, referred_by)
    values (new.id, public.generate_referral_code(coalesce(name, new.email)), referrer);
  end if;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Sensitive columns (role, suspension, credits, referral fields) are protected by
-- column-level privileges in the RLS migration: API roles can only UPDATE the
-- columns explicitly granted to them. Changes to the rest go through audited,
-- admin-checked SECURITY DEFINER functions.

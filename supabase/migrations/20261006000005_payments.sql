-- =============================================================================
-- UniSolve · 0005 · Payments, coupons, referrals, ledger, payouts
-- Launch method is manual UPI: the student pays the platform UPI QR, submits the
-- UTR (+ optional screenshot), and an admin verifies it. The `provider` column
-- lets Razorpay/Stripe be added later without schema changes.
-- =============================================================================

create type public.payment_status as enum ('pending_verification', 'verified', 'rejected', 'refunded', 'partially_refunded');
create type public.payment_provider as enum ('upi_manual', 'razorpay', 'stripe', 'credit');

create table public.coupons (
  id              uuid primary key default gen_random_uuid(),
  code            text not null unique check (code ~ '^[A-Z0-9]{3,20}$'),
  description     text,
  discount_type   text not null check (discount_type in ('percent', 'fixed')),
  discount_value  integer not null check (discount_value > 0),
  max_discount    integer check (max_discount > 0),        -- cap for percent coupons
  min_order       integer not null default 0,
  starts_at       timestamptz not null default now(),
  expires_at      timestamptz,
  usage_limit     integer check (usage_limit > 0),          -- total redemptions
  per_user_limit  integer not null default 1 check (per_user_limit > 0),
  first_order_only boolean not null default false,
  is_active       boolean not null default true,
  created_by      uuid references public.profiles (id),
  created_at      timestamptz not null default now(),
  constraint coupons_percent_range check (discount_type <> 'percent' or discount_value <= 100)
);

alter table public.requests
  add constraint requests_coupon_fk foreign key (coupon_id) references public.coupons (id) on delete set null;

create table public.coupon_redemptions (
  id          uuid primary key default gen_random_uuid(),
  coupon_id   uuid not null references public.coupons (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  request_id  uuid not null references public.requests (id) on delete cascade,
  amount      integer not null,
  created_at  timestamptz not null default now(),
  unique (coupon_id, request_id)
);
create index coupon_redemptions_user_idx on public.coupon_redemptions (coupon_id, user_id);

create table public.payments (
  id              uuid primary key default gen_random_uuid(),
  request_id      uuid not null references public.requests (id) on delete restrict,
  milestone_id    uuid references public.milestones (id) on delete set null,
  student_id      uuid not null references public.profiles (id) on delete restrict,
  amount          integer not null check (amount > 0),        -- rupees actually paid
  credit_applied  integer not null default 0 check (credit_applied >= 0),
  provider        public.payment_provider not null default 'upi_manual',
  provider_ref    text,                                       -- UTR / gateway payment id
  proof_path      text,                                       -- private bucket 'payment-proofs'
  status          public.payment_status not null default 'pending_verification',
  rejection_reason text,
  verified_by     uuid references public.profiles (id),
  verified_at     timestamptz,
  refunded_amount integer not null default 0 check (refunded_amount >= 0),
  created_at      timestamptz not null default now(),
  constraint payments_utr_format check (provider <> 'upi_manual' or provider_ref ~ '^[0-9A-Za-z]{10,22}$')
);
create index payments_request_idx on public.payments (request_id);
create index payments_status_idx on public.payments (status, created_at desc);
create index payments_student_idx on public.payments (student_id, created_at desc);
-- The same UTR can't be submitted twice.
create unique index payments_provider_ref_idx on public.payments (provider, provider_ref) where provider_ref is not null;

-- Double-entry-lite ledger of every money movement, for reporting and audits.
create type public.transaction_type as enum ('payment', 'refund', 'commission', 'expert_earning', 'payout', 'credit_grant', 'credit_use');
create table public.transactions (
  id            bigserial primary key,
  type          public.transaction_type not null,
  amount        integer not null,                -- rupees; sign by type convention (always positive)
  user_id       uuid references public.profiles (id) on delete set null,
  request_id    uuid references public.requests (id) on delete set null,
  payment_id    uuid references public.payments (id) on delete set null,
  payout_id     uuid,
  note          text,
  created_at    timestamptz not null default now()
);
create index transactions_user_idx on public.transactions (user_id, created_at desc);
create index transactions_type_idx on public.transactions (type, created_at desc);

create type public.payout_status as enum ('pending', 'processing', 'paid', 'failed');
create table public.payouts (
  id            uuid primary key default gen_random_uuid(),
  expert_id     uuid not null references public.expert_profiles (user_id) on delete restrict,
  amount        integer not null check (amount > 0),
  status        public.payout_status not null default 'pending',
  reference     text,                 -- UPI transaction reference once paid
  processed_by  uuid references public.profiles (id),
  processed_at  timestamptz,
  created_at    timestamptz not null default now()
);
create index payouts_expert_idx on public.payouts (expert_id, created_at desc);
create index payouts_status_idx on public.payouts (status);

alter table public.transactions
  add constraint transactions_payout_fk foreign key (payout_id) references public.payouts (id) on delete set null;

create type public.referral_status as enum ('pending', 'rewarded', 'void');
create table public.referrals (
  id            uuid primary key default gen_random_uuid(),
  referrer_id   uuid not null references public.profiles (id) on delete cascade,
  referee_id    uuid not null unique references public.profiles (id) on delete cascade,
  status        public.referral_status not null default 'pending',
  reward_amount integer,
  rewarded_at   timestamptz,
  created_at    timestamptz not null default now(),
  check (referrer_id <> referee_id)
);
create index referrals_referrer_idx on public.referrals (referrer_id);

-- Record the referral when a referred student signs up.
create or replace function public.track_referral()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.referred_by is not null and new.referred_by <> new.user_id then
    insert into public.referrals (referrer_id, referee_id) values (new.referred_by, new.user_id)
    on conflict (referee_id) do nothing;
  end if;
  return new;
end $$;

create trigger student_profiles_referral after insert on public.student_profiles
  for each row execute function public.track_referral();

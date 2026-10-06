-- Development-only seed data. Applied by `supabase db reset` on a LOCAL stack,
-- never by `supabase db push` to production. Do not put real data here.

insert into public.coupons (code, description, discount_type, discount_value, max_discount, min_order, first_order_only, usage_limit) values
  ('FIRST100',   'Dev: ₹100 off your first order', 'fixed',   100, null, 499, true,  null),
  ('STUDENT50',  'Dev: 50% off up to ₹250',        'percent',  50, 250, 199, false, 100),
  ('WELCOME200', 'Dev: ₹200 off orders over ₹999', 'fixed',   200, null, 999, false, 50)
on conflict (code) do nothing;

update public.platform_settings set upi_id = 'unisolve-dev@upi', upi_payee_name = 'UniSolve (DEV)';

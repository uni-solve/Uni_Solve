-- =============================================================================
-- UniSolve · 0012 · Admin read models
-- Emails live in auth.users (not exposed to the API), so admin screens read
-- contact details through these admin-checked functions.
-- =============================================================================

create or replace function public.admin_user_contact(p_user uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only' using errcode = '42501'; end if;
  return (
    select jsonb_build_object(
      'id', p.id, 'display_name', p.display_name, 'role', p.role, 'is_suspended', p.is_suspended,
      'email', u.email, 'is_guest', coalesce(u.is_anonymous, false), 'phone', sp.phone,
      'institution', sp.institution, 'credit', coalesce(sp.credit_balance, 0) / 100,
      'joined', p.created_at,
      'requests', (select count(*) from public.requests r where r.student_id = p.id),
      'completed', (select count(*) from public.requests r where r.student_id = p.id and r.status = 'completed'))
    from public.profiles p
    join auth.users u on u.id = p.id
    left join public.student_profiles sp on sp.user_id = p.id
    where p.id = p_user);
end $$;

create or replace function public.admin_list_students(p_search text default null, p_limit int default 100, p_offset int default 0)
returns table (
  id uuid, display_name text, email text, is_guest boolean, phone text, is_suspended boolean, joined timestamptz,
  requests bigint, completed bigint, total_spent bigint, credit integer, referral_code text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only' using errcode = '42501'; end if;
  return query
  select p.id, p.display_name, u.email::text, coalesce(u.is_anonymous, false), sp.phone, p.is_suspended, p.created_at,
    (select count(*) from public.requests r where r.student_id = p.id),
    (select count(*) from public.requests r where r.student_id = p.id and r.status = 'completed'),
    coalesce((select sum(pay.amount + pay.credit_applied - pay.refunded_amount) from public.payments pay
              where pay.student_id = p.id and pay.status in ('verified', 'partially_refunded', 'refunded')), 0)::bigint,
    coalesce(sp.credit_balance, 0) / 100, sp.referral_code
  from public.profiles p
  join auth.users u on u.id = p.id
  left join public.student_profiles sp on sp.user_id = p.id
  where p.role = 'student'
    and (p_search is null or p_search = ''
         or u.email ilike '%' || p_search || '%' or p.display_name ilike '%' || p_search || '%' or sp.referral_code ilike '%' || p_search || '%')
  order by p.created_at desc
  limit least(p_limit, 500) offset greatest(p_offset, 0);
end $$;

create or replace function public.admin_category_breakdown(p_days int default 30)
returns table (category text, requests bigint, completed bigint, revenue bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only' using errcode = '42501'; end if;
  return query
  select c.name,
    count(r.id),
    count(r.id) filter (where r.status = 'completed'),
    coalesce(sum((select sum(pay.amount + pay.credit_applied - pay.refunded_amount) from public.payments pay
                  where pay.request_id = r.id and pay.status in ('verified', 'partially_refunded', 'refunded'))), 0)::bigint
  from public.categories c
  left join public.requests r on r.category_id = c.id and r.submitted_at > now() - make_interval(days => least(p_days, 365))
  group by c.id, c.name, c.sort_order
  order by count(r.id) desc, c.sort_order;
end $$;

revoke execute on function public.admin_user_contact(uuid), public.admin_list_students(text, int, int), public.admin_category_breakdown(int) from public, anon;
grant execute on function public.admin_user_contact(uuid), public.admin_list_students(text, int, int), public.admin_category_breakdown(int) to authenticated;

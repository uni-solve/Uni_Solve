-- =============================================================================
-- UniSolve · 0013 · Notify the admin about student messages
-- In solo mode no expert is assigned, so student messages notify admins
-- (throttled: one unread alert per request per 15 minutes).
-- =============================================================================

create or replace function public.on_message_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare r public.requests; recipient uuid; a uuid; link text;
begin
  if new.sender_id is null then return new; end if;  -- system messages
  perform public.enforce_rate_limit('message', 30, 60);
  select * into r from public.requests where id = new.request_id;

  if new.sender_id = r.student_id then
    recipient := r.assigned_expert_id;
  else
    recipient := r.student_id;
  end if;

  if recipient is not null then
    link := case when recipient = r.student_id then '/dashboard/request/?id=' else '/expert/work/?id=' end || r.code;
    if not exists (select 1 from public.notifications where user_id = recipient and request_id = r.id and type = 'new_message'
                   and read_at is null and created_at > now() - interval '15 minutes') then
      perform public.notify(recipient, 'new_message', 'New message on ' || r.code, left(coalesce(new.body, 'Attachment'), 140), link, r.id);
    end if;
  elsif new.sender_id = r.student_id then
    for a in select id from public.profiles where role = 'admin' and not is_suspended loop
      if not exists (select 1 from public.notifications where user_id = a and request_id = r.id and type = 'new_message'
                     and read_at is null and created_at > now() - interval '15 minutes') then
        perform public.notify(a, 'new_message', 'Student message on ' || r.code, left(coalesce(new.body, 'Attachment'), 140), '/admin/request/?id=' || r.code, r.id);
      end if;
    end loop;
  end if;
  return new;
end $$;

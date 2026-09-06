begin;

create table if not exists public.technical_tasks (
  id uuid primary key default gen_random_uuid(),
  task_code text not null unique,
  title text not null check (length(btrim(title)) >= 3),
  status text not null default 'open' check (status in ('open','in_progress','blocked','resolved','closed')),
  assigned_to uuid references public.profiles(id) on delete set null,
  source_request_id uuid references public.support_requests(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists technical_tasks_status_updated_idx on public.technical_tasks(status, updated_at desc);
create index if not exists technical_tasks_source_request_idx on public.technical_tasks(source_request_id) where source_request_id is not null;

alter table public.support_requests
  add column if not exists technical_task_id uuid references public.technical_tasks(id) on delete set null;
create index if not exists support_requests_technical_task_idx on public.support_requests(technical_task_id) where technical_task_id is not null;

alter table public.technical_tasks enable row level security;
revoke all on table public.technical_tasks from anon, authenticated;
grant select on table public.technical_tasks to authenticated;

drop policy if exists technical_tasks_staff_read on public.technical_tasks;
create policy technical_tasks_staff_read
on public.technical_tasks for select
to authenticated
using ((select auth.uid()) is not null and (select private.is_staff()));

drop trigger if exists technical_tasks_set_updated_at on public.technical_tasks;
create trigger technical_tasks_set_updated_at
before update on public.technical_tasks
for each row execute function private.set_updated_at();

create or replace function private.create_support_technical_task(
  p_request_id uuid,
  p_title text
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_actor uuid := auth.uid();
  v_request jsonb;
  v_task public.technical_tasks%rowtype;
  v_code text;
  v_title text := btrim(coalesce(p_title,''));
begin
  if v_actor is null or not (select private.is_staff()) then
    raise exception 'staff_required' using errcode='42501';
  end if;
  if length(v_title) < 3 then
    raise exception 'technical_task_title_required' using errcode='22023';
  end if;

  select to_jsonb(s) into v_request
  from public.support_requests s
  where s.id=p_request_id
  for update;
  if v_request is null then raise exception 'support_request_not_found' using errcode='P0002'; end if;

  v_code := 'TECH-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,12));
  insert into public.technical_tasks(task_code,title,status,source_request_id,created_by)
  values(v_code,v_title,'open',p_request_id,v_actor)
  returning * into v_task;

  update public.support_requests
  set technical_task_id=v_task.id
  where id=p_request_id;

  insert into public.audit_events(actor_user_id,action,entity_table,entity_id,before_data,after_data,source)
  values(v_actor,'create_support_technical_task','support_requests',p_request_id::text,v_request,
    jsonb_build_object('technical_task',to_jsonb(v_task)),'support_technical_task_v1');

  return jsonb_build_object('created',true,'task',to_jsonb(v_task));
end $$;

revoke all on function private.create_support_technical_task(uuid,text) from public,anon;
grant execute on function private.create_support_technical_task(uuid,text) to authenticated;

create or replace function public.admin_create_support_technical_task(
  p_request_id uuid,
  p_title text
)
returns jsonb
language sql
security invoker
set search_path=''
as $$
  select private.create_support_technical_task(p_request_id,p_title);
$$;

revoke all on function public.admin_create_support_technical_task(uuid,text) from public,anon;
grant execute on function public.admin_create_support_technical_task(uuid,text) to authenticated;

create or replace function public.admin_update_support_request_v2(
  p_request_id uuid,
  p_status text,
  p_priority text,
  p_assigned_to uuid default null,
  p_internal_notes text default null,
  p_resolution_note text default null,
  p_technical_task_id uuid default null
)
returns jsonb
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_actor uuid := auth.uid();
  v_before jsonb;
  v_after jsonb;
  v_existing_resolved_at timestamptz;
  v_assignee_valid boolean;
  v_task_status text;
begin
  if v_actor is null or not (select private.is_staff()) then
    raise exception 'staff_required' using errcode='42501';
  end if;
  if p_status not in ('new','triaged','in_progress','waiting_user','resolved','closed','spam','archived') then
    raise exception 'invalid_support_status' using errcode='22023';
  end if;
  if p_priority not in ('low','normal','high','urgent') then
    raise exception 'invalid_support_priority' using errcode='22023';
  end if;

  if p_assigned_to is not null then
    select exists(
      select 1 from public.profiles p
      where p.id=p_assigned_to and p.is_active and p.role=any(array['editor','verifier','admin']::public.staff_role[])
    ) into v_assignee_valid;
    if not v_assignee_valid then raise exception 'invalid_support_assignee' using errcode='23514'; end if;
  end if;

  if p_technical_task_id is not null then
    select t.status into v_task_status
    from public.technical_tasks t
    where t.id=p_technical_task_id
    for share;
    if v_task_status is null then raise exception 'technical_task_not_found' using errcode='P0002'; end if;
    if v_task_status='closed' then raise exception 'closed_technical_task_not_assignable' using errcode='23514'; end if;
  end if;

  select to_jsonb(s), s.resolved_at
    into v_before, v_existing_resolved_at
  from public.support_requests s
  where s.id=p_request_id
  for update;
  if v_before is null then raise exception 'support_request_not_found' using errcode='P0002'; end if;

  update public.support_requests
  set status=p_status,
      priority=p_priority,
      assigned_to=p_assigned_to,
      internal_notes=nullif(btrim(coalesce(p_internal_notes,'')),''),
      resolution_note=nullif(btrim(coalesce(p_resolution_note,'')),''),
      technical_task_id=p_technical_task_id,
      resolved_at=case when p_status in ('resolved','closed','archived') then coalesce(v_existing_resolved_at,now()) else null end,
      archived_at=case when p_status='archived' then now() else null end
  where id=p_request_id;

  select to_jsonb(s) into v_after from public.support_requests s where s.id=p_request_id;

  insert into public.audit_events(actor_user_id,action,entity_table,entity_id,before_data,after_data,source)
  values(v_actor,'process_support_request','support_requests',p_request_id::text,v_before,v_after,'support_atomic_update_v2');

  return jsonb_build_object('updated',true,'id',p_request_id,'record',v_after);
end $$;

revoke all on function public.admin_update_support_request_v2(uuid,text,text,uuid,text,text,uuid) from public,anon;
grant execute on function public.admin_update_support_request_v2(uuid,text,text,uuid,text,text,uuid) to authenticated;
revoke execute on function public.admin_update_support_request(uuid,text,text,uuid,text,text,text) from authenticated;

commit;
-- Coffee Platform V1 — Closed-loop Media Vault asset lifecycle.
-- One governed path: technical audit -> approval/active -> quarantine/legal hold
-- -> 30-day retention -> disposal approval -> audited purge.
begin;

alter table public.media_assets
  add column if not exists quarantine_started_at timestamptz,
  add column if not exists retention_expires_at timestamptz;

update public.media_assets
set quarantine_started_at=coalesce(quarantine_started_at,restricted_at,updated_at),
    retention_expires_at=coalesce(retention_expires_at,coalesce(restricted_at,updated_at)+interval '30 days')
where publication_status='quarantined';

alter table public.media_assets
  drop constraint if exists media_assets_quarantine_clock_check;
alter table public.media_assets
  add constraint media_assets_quarantine_clock_check check (
    (quarantine_started_at is null and retention_expires_at is null)
    or (quarantine_started_at is not null and retention_expires_at >= quarantine_started_at+interval '30 days')
  );
create index if not exists media_assets_retention_queue_idx
  on public.media_assets(retention_expires_at,id)
  where publication_status='quarantined' and legal_hold=false;

alter table public.entity_media add column if not exists asset_id uuid;
update public.entity_media e set asset_id=a.id
from public.media_assets a where e.asset_id is null and a.id=e.id;
update public.entity_media e set asset_id=a.id
from public.media_assets a
where e.asset_id is null and (a.published_storage_path=e.storage_path or a.original_storage_path=e.storage_path);
do $$ begin
  if exists(select 1 from public.entity_media where asset_id is null) then
    raise exception 'entity_media_asset_backfill_incomplete';
  end if;
end $$;
alter table public.entity_media alter column asset_id set not null;
alter table public.entity_media drop constraint if exists entity_media_asset_id_fkey;
alter table public.entity_media add constraint entity_media_asset_id_fkey
  foreign key(asset_id) references public.media_assets(id) on delete restrict;
create index if not exists entity_media_asset_id_idx on public.entity_media(asset_id);

create or replace function private.media_target_is_active(p_entity_type text,p_entity_id uuid)
returns boolean language plpgsql stable security definer set search_path='' as $$
begin
  if p_entity_type='products' then return exists(select 1 from public.products where id=p_entity_id and status='published');
  elsif p_entity_type='organizations' then return exists(select 1 from public.organizations where id=p_entity_id and status='published');
  elsif p_entity_type='brands' then return exists(select 1 from public.brands where id=p_entity_id and status='published');
  elsif p_entity_type='offers' then return exists(select 1 from public.offers where id=p_entity_id and status='published');
  elsif p_entity_type='contents' then return exists(select 1 from public.contents where id=p_entity_id and status='published');
  elsif p_entity_type='origin_claims' then return exists(select 1 from public.origin_claims where id=p_entity_id and status='published');
  end if;
  return false;
end $$;
revoke all on function private.media_target_is_active(text,uuid) from public;
grant execute on function private.media_target_is_active(text,uuid) to anon,authenticated;

create or replace function private.media_entity_is_public(p_asset_id uuid,p_entity_type text,p_entity_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(
    select 1 from public.media_assets a
    where a.id=p_asset_id
      and a.technical_status='passed'
      and a.publication_status='published'
      and not a.legal_hold
      and a.published_storage_path is not null
      and exists(select 1 from public.media_rights_assertions r where r.asset_id=a.id and r.review_status='accepted' and (r.expires_at is null or r.expires_at>=current_date))
      and exists(select 1 from public.media_asset_links l where l.asset_id=a.id and l.entity_type=p_entity_type and l.entity_id=p_entity_id and l.link_status='active')
      and private.media_target_is_active(p_entity_type,p_entity_id)
  )
$$;
revoke all on function private.media_entity_is_public(uuid,text,uuid) from public;
grant execute on function private.media_entity_is_public(uuid,text,uuid) to anon,authenticated;

do $$ declare p record; begin
  for p in select policyname from pg_policies where schemaname='public' and tablename='entity_media' and cmd='SELECT'
  loop execute format('drop policy if exists %I on public.entity_media',p.policyname); end loop;
end $$;
create policy entity_media_public_active_select on public.entity_media for select to anon
  using ((select private.media_entity_is_public(asset_id,entity_table,entity_id)));
create policy entity_media_authenticated_select on public.entity_media for select to authenticated
  using ((select private.is_staff()) or (select private.media_entity_is_public(asset_id,entity_table,entity_id)));

create or replace function private.assert_media_link_target()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if not private.media_target_exists(new.entity_type,new.entity_id) then raise exception 'invalid_media_target'; end if;
  if new.link_status='active' and not exists(
    select 1 from public.media_assets a where a.id=new.asset_id
      and a.technical_status='passed' and a.publication_status='published' and not a.legal_hold
      and exists(select 1 from public.media_rights_assertions r where r.asset_id=a.id and r.review_status='accepted' and (r.expires_at is null or r.expires_at>=current_date))
      and private.media_target_is_active(new.entity_type,new.entity_id)
  ) then raise exception 'asset_not_active_or_target_not_published'; end if;
  return new;
end $$;

alter table public.media_purge_requests
  add column if not exists execution_started_at timestamptz,
  add column if not exists execution_result jsonb;
alter table public.media_purge_requests drop constraint if exists media_purge_requests_status_check;
alter table public.media_purge_requests add constraint media_purge_requests_status_check
  check (status in ('pending','approved','rejected','cancelled','executing','executed'));
alter table public.media_purge_requests drop constraint if exists media_purge_requests_check;
alter table public.media_purge_requests drop constraint if exists media_purge_requests_check1;
alter table public.media_purge_requests add constraint media_purge_requests_review_check
  check ((status in ('approved','rejected','executing','executed'))=(reviewed_at is not null) or status in ('pending','cancelled'));
alter table public.media_purge_requests add constraint media_purge_requests_execution_check
  check ((status in ('executing','executed'))=(execution_started_at is not null) or status in ('pending','approved','rejected','cancelled'));
alter table public.media_purge_requests add constraint media_purge_requests_executed_check
  check ((status='executed')=(executed_at is not null));
drop index if exists public.media_purge_requests_one_pending_idx;
create unique index media_purge_requests_one_open_idx on public.media_purge_requests(asset_id)
  where status in ('pending','approved','executing');

create table public.media_asset_disposal_audit (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null unique,
  purge_request_id uuid not null unique,
  asset_snapshot jsonb not null,
  relations_snapshot jsonb not null,
  storage_result jsonb not null,
  disposed_by uuid not null references public.profiles(id) on delete restrict,
  disposed_at timestamptz not null default now(),
  policy_version text not null default 'media-lifecycle-v1'
);
alter table public.media_asset_disposal_audit enable row level security;
grant select on public.media_asset_disposal_audit to authenticated;
create policy media_asset_disposal_audit_admin_select on public.media_asset_disposal_audit for select to authenticated
  using ((select private.is_staff(array['admin']::public.staff_role[])));

create or replace view public.media_asset_lifecycle with (security_invoker=true) as
select a.id asset_id,
  case
    when a.legal_hold then 'legal_hold'
    when pr.status='executing' then 'disposal_executing'
    when pr.status='approved' then 'disposal_approved'
    when pr.status='pending' then 'disposal_requested'
    when a.publication_status='quarantined' and a.retention_expires_at<=now() then 'disposal_eligible'
    when a.publication_status='quarantined' then 'quarantine_retention'
    when a.technical_status='validating' then 'pending_technical_audit'
    when a.technical_status='rejected' then 'technical_rejected'
    when a.technical_status='duplicate' then 'duplicate_review'
    when a.technical_status='passed' and a.publication_status='published'
      and exists(select 1 from public.media_rights_assertions r where r.asset_id=a.id and r.review_status='accepted' and (r.expires_at is null or r.expires_at>=current_date))
      and exists(select 1 from public.media_asset_links l where l.asset_id=a.id and l.link_status='active')
      then 'active'
    else 'pending_approval'
  end lifecycle_state,
  a.quarantine_started_at,a.retention_expires_at,
  case when a.retention_expires_at is null then null else greatest(0,ceil(extract(epoch from (a.retention_expires_at-now()))/86400.0))::integer end retention_days_remaining,
  pr.id purge_request_id,pr.status purge_request_status,
  (a.technical_status='passed' and a.publication_status='published' and not a.legal_hold
    and exists(select 1 from public.media_rights_assertions r where r.asset_id=a.id and r.review_status='accepted' and (r.expires_at is null or r.expires_at>=current_date))
    and exists(select 1 from public.media_asset_links l where l.asset_id=a.id and l.link_status='active')) public_eligible
from public.media_assets a
left join lateral (
  select p.id,p.status from public.media_purge_requests p
  where p.asset_id=a.id and p.status in ('pending','approved','executing')
  order by p.requested_at desc limit 1
) pr on true;
revoke all on public.media_asset_lifecycle from public,anon;
grant select on public.media_asset_lifecycle to authenticated;

create or replace function public.admin_media_finalize_publication(p_asset_id uuid,p_public_url text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_actor uuid:=auth.uid(); v_asset public.media_assets%rowtype; v_link public.media_asset_links%rowtype; v_rights public.media_rights_assertions%rowtype; v_media_id uuid;
begin
  if v_actor is null or not (select private.is_staff(array['verifier','admin']::public.staff_role[])) then raise exception 'reviewer_required' using errcode='42501'; end if;
  select * into v_asset from public.media_assets where id=p_asset_id for update;
  if not found or v_asset.publication_status<>'publishing' or v_asset.approved_by<>v_actor or v_asset.legal_hold then raise exception 'publication_not_prepared'; end if;
  if p_public_url !~ '^https://[^/]+/storage/v1/object/public/public-media/' then raise exception 'invalid_public_url'; end if;
  if not exists(select 1 from storage.objects where bucket_id='public-media' and name=v_asset.published_storage_path) then raise exception 'published_object_missing'; end if;
  select * into v_link from public.media_asset_links where asset_id=p_asset_id and link_status='pending' order by linked_at limit 1 for update;
  if not found or not private.media_target_is_active(v_link.entity_type,v_link.entity_id) then raise exception 'active_target_required'; end if;
  select * into v_rights from public.media_rights_assertions where asset_id=p_asset_id and review_status='accepted' and (expires_at is null or expires_at>=current_date) order by reviewed_at desc limit 1;
  if not found then raise exception 'accepted_rights_required'; end if;
  update public.media_assets set publication_status='published',published_at=now(),quarantine_started_at=null,retention_expires_at=null,restricted_at=null,updated_at=now() where id=p_asset_id;
  update public.media_asset_links set link_status='active',updated_at=now() where id=v_link.id;
  insert into public.entity_media(asset_id,entity_table,entity_id,storage_path,url,alt_ar,rights_note,is_primary,sort_order,created_by)
  values(p_asset_id,v_link.entity_type,v_link.entity_id,v_asset.published_storage_path,p_public_url,v_link.alt_ar,concat(v_rights.rights_basis,': ',v_rights.copyright_owner),v_link.is_primary,v_link.sort_order,v_link.linked_by)
  returning id into v_media_id;
  insert into public.media_ingestion_events(asset_id,event_type,previous_state,next_state,actor_user_id,policy_version,correlation_id,technical_report)
  values(p_asset_id,'publication_finalized','PUBLISHING','ACTIVE',v_actor,'media-lifecycle-v1',gen_random_uuid(),jsonb_build_object('entity_media_id',v_media_id));
  return jsonb_build_object('asset_id',p_asset_id,'lifecycle_state','active','entity_media_id',v_media_id,'url',p_public_url);
end $$;

create or replace function public.admin_media_vault_action(p_action text,p_asset_ids uuid[],p_payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
  v_actor uuid:=auth.uid(); v_role text; v_asset public.media_assets%rowtype; v_previous text; v_next text;
  v_reason text:=trim(coalesce(p_payload->>'reason','')); v_note text:=trim(coalesce(p_payload->>'review_note',''));
  v_alt_ar text:=nullif(trim(p_payload->>'alt_ar'),''); v_caption_ar text:=nullif(trim(p_payload->>'caption_ar'),'');
  v_operator_note text:=nullif(trim(p_payload->>'operator_note'),''); v_count integer:=0; v_target record;
begin
  if v_actor is null or not (select private.is_staff()) then raise exception 'staff_required' using errcode='42501'; end if;
  select role::text into v_role from public.profiles where id=v_actor and is_active;
  if coalesce(cardinality(p_asset_ids),0)<1 or cardinality(p_asset_ids)>100 then raise exception 'asset_selection_required'; end if;
  if (select count(*) from public.media_assets where id=any(p_asset_ids))<>cardinality(p_asset_ids) then raise exception 'asset_not_found'; end if;
  if p_action in ('quarantine','restore') and v_role not in ('verifier','admin') then raise exception 'reviewer_required' using errcode='42501'; end if;
  if p_action in ('unlink','request_purge','approve_purge','reject_purge') and v_role<>'admin' then raise exception 'admin_required' using errcode='42501'; end if;
  for v_asset in select * from public.media_assets where id=any(p_asset_ids) order by id for update loop
    v_previous:=v_asset.publication_status; v_next:=v_previous;
    if p_action='quarantine' then
      if length(v_reason)<5 then raise exception 'quarantine_reason_required'; end if;
      if exists(select 1 from public.media_asset_links l where l.asset_id=v_asset.id and l.link_status='active')
        or exists(select 1 from public.entity_media e where e.asset_id=v_asset.id and private.media_target_is_active(e.entity_table,e.entity_id))
      then raise exception 'active_record_links_block_quarantine'; end if;
      if v_asset.publication_status='quarantined' then continue; end if;
      update public.media_assets set publication_status='quarantined',restricted_at=now(),quarantine_started_at=now(),retention_expires_at=now()+interval '30 days',
        technical_report=technical_report||jsonb_build_object('previous_publication_status',v_asset.publication_status,'quarantine_reason',left(v_reason,1000),'quarantined_by',v_actor,'quarantined_at',now()) where id=v_asset.id;
      update public.media_asset_links set link_status='suppressed' where asset_id=v_asset.id and link_status='pending';
      v_next:='quarantine_retention';
    elsif p_action='restore' then
      if v_asset.publication_status<>'quarantined' then raise exception 'asset_not_quarantined'; end if;
      if v_asset.legal_hold then raise exception 'legal_hold_blocks_restore'; end if;
      v_next:=coalesce(v_asset.technical_report->>'previous_publication_status','private');
      if v_next not in ('private','ready_for_review','rejected','archived') then v_next:='private'; end if;
      update public.media_assets set publication_status=v_next,restricted_at=null,quarantine_started_at=null,retention_expires_at=null,
        technical_report=technical_report||jsonb_build_object('restored_by',v_actor,'restored_at',now()) where id=v_asset.id;
      update public.media_asset_links set link_status='pending' where asset_id=v_asset.id and link_status='suppressed';
    elsif p_action='unlink' then
      for v_target in select distinct entity_table,entity_id from public.entity_media where asset_id=v_asset.id loop
        delete from public.entity_media where asset_id=v_asset.id and entity_table=v_target.entity_table and entity_id=v_target.entity_id;
        if not exists(select 1 from public.entity_media where entity_table=v_target.entity_table and entity_id=v_target.entity_id and is_primary) then
          update public.entity_media set is_primary=true where id=(select id from public.entity_media where entity_table=v_target.entity_table and entity_id=v_target.entity_id order by sort_order,created_at limit 1);
        end if;
      end loop;
      update public.media_asset_links set link_status='removed',is_primary=false where asset_id=v_asset.id and link_status<>'removed';
      v_next:='unlinked';
    elsif p_action='update_metadata' then
      if v_alt_ar is null and v_caption_ar is null and v_operator_note is null then raise exception 'metadata_required'; end if;
      if v_alt_ar is not null and length(v_alt_ar)<2 then raise exception 'invalid_alt_text'; end if;
      update public.media_asset_links set alt_ar=coalesce(v_alt_ar,alt_ar),caption_ar=coalesce(v_caption_ar,caption_ar) where asset_id=v_asset.id and link_status<>'removed';
      update public.entity_media set alt_ar=coalesce(v_alt_ar,alt_ar) where asset_id=v_asset.id;
      update public.media_assets set technical_report=technical_report||jsonb_strip_nulls(jsonb_build_object('operator_note',v_operator_note,'metadata_updated_by',v_actor,'metadata_updated_at',now())) where id=v_asset.id;
      v_next:='metadata_updated';
    elsif p_action='request_purge' then
      if length(v_reason)<10 then raise exception 'purge_reason_required'; end if;
      if v_asset.legal_hold then raise exception 'legal_hold_blocks_purge'; end if;
      if v_asset.publication_status<>'quarantined' then raise exception 'quarantine_required_before_purge'; end if;
      if v_asset.retention_expires_at is null or v_asset.retention_expires_at>now() then raise exception 'retention_period_active'; end if;
      if exists(select 1 from public.media_asset_links where asset_id=v_asset.id and link_status in ('pending','active')) or exists(select 1 from public.entity_media where asset_id=v_asset.id) then raise exception 'active_links_block_purge'; end if;
      if exists(select 1 from public.media_assets where duplicate_of_asset_id=v_asset.id) then raise exception 'dependent_duplicates_block_purge'; end if;
      insert into public.media_purge_requests(asset_id,reason,requested_by) values(v_asset.id,left(v_reason,1000),v_actor)
      on conflict (asset_id) where status in ('pending','approved','executing') do nothing;
      v_next:='disposal_requested';
    elsif p_action in ('approve_purge','reject_purge') then
      if not exists(select 1 from public.media_purge_requests where asset_id=v_asset.id and status='pending') then raise exception 'pending_purge_request_missing'; end if;
      if p_action='approve_purge' then
        if v_asset.legal_hold or v_asset.retention_expires_at is null or v_asset.retention_expires_at>now() then raise exception 'asset_not_disposal_eligible'; end if;
        update public.media_purge_requests set status='approved',reviewed_by=v_actor,reviewed_at=now(),review_note=nullif(left(v_note,1000),'') where asset_id=v_asset.id and status='pending';
        v_next:='disposal_approved';
      else
        if length(v_note)<5 then raise exception 'review_note_required'; end if;
        update public.media_purge_requests set status='rejected',reviewed_by=v_actor,reviewed_at=now(),review_note=left(v_note,1000) where asset_id=v_asset.id and status='pending';
        v_next:='disposal_rejected';
      end if;
    else raise exception 'invalid_media_vault_action'; end if;
    insert into public.media_ingestion_events(asset_id,event_type,previous_state,next_state,actor_user_id,policy_version,correlation_id,technical_report)
    values(v_asset.id,'lifecycle_'||p_action,upper(v_previous),upper(v_next),v_actor,'media-lifecycle-v1',gen_random_uuid(),jsonb_build_object('payload',p_payload,'source','media_vault'));
    v_count:=v_count+1;
  end loop;
  return jsonb_build_object('action',p_action,'affected',v_count,'asset_ids',p_asset_ids);
end $$;

create or replace function public.admin_media_open_legal_case(p_payload jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_actor uuid:=auth.uid(); v_case uuid:=gen_random_uuid(); v_asset uuid:=nullif(p_payload->>'asset_id','')::uuid; v_ref text; v_previous text;
begin
  if v_actor is null or not (select private.is_staff()) then raise exception 'staff_required' using errcode='42501'; end if;
  select publication_status into v_previous from public.media_assets where id=v_asset for update;
  if not found then raise exception 'asset_not_found'; end if;
  insert into public.media_legal_cases(id,notice_type,claimant_name,claimant_email,claimant_authority,claimed_work,complaint_text,jurisdiction,evidence,good_faith_statement,accuracy_statement,electronic_signature,submitted_by,due_at)
  values(v_case,p_payload->>'notice_type',trim(p_payload->>'claimant_name'),lower(trim(p_payload->>'claimant_email')),trim(p_payload->>'claimant_authority'),trim(p_payload->>'claimed_work'),trim(p_payload->>'complaint_text'),nullif(trim(p_payload->>'jurisdiction'),''),coalesce(p_payload->'evidence','[]'::jsonb),coalesce((p_payload->>'good_faith_statement')::boolean,false),coalesce((p_payload->>'accuracy_statement')::boolean,false),trim(p_payload->>'electronic_signature'),v_actor,now()+interval '1 day') returning public_reference into v_ref;
  insert into public.media_legal_case_assets(case_id,asset_id,access_restricted) values(v_case,v_asset,true);
  insert into public.media_legal_case_events(case_id,event_type,next_status,actor_user_id,note) values(v_case,'notice_received','access_restricted',v_actor,'Asset disabled immediately and preserved under legal hold.');
  update public.media_assets set legal_hold=true,publication_status='quarantined',restricted_at=now(),quarantine_started_at=coalesce(quarantine_started_at,now()),retention_expires_at=coalesce(retention_expires_at,now()+interval '30 days'),updated_at=now() where id=v_asset;
  update public.media_asset_links set link_status='suppressed' where asset_id=v_asset and link_status in ('pending','active');
  delete from public.entity_media where asset_id=v_asset;
  insert into public.media_ingestion_events(asset_id,event_type,previous_state,next_state,actor_user_id,policy_version,correlation_id,technical_report)
  values(v_asset,'legal_hold_opened',upper(v_previous),'LEGAL_HOLD',v_actor,'media-lifecycle-v1',gen_random_uuid(),jsonb_build_object('case_id',v_case));
  return jsonb_build_object('case_id',v_case,'public_reference',v_ref,'status','access_restricted');
end $$;

create or replace function public.admin_media_prepare_purge(p_request_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_actor uuid:=auth.uid(); v_request public.media_purge_requests%rowtype; v_asset public.media_assets%rowtype; v_objects jsonb;
begin
  if v_actor is null or not (select private.is_staff(array['admin']::public.staff_role[])) then raise exception 'admin_required' using errcode='42501'; end if;
  select * into v_request from public.media_purge_requests where id=p_request_id for update;
  if not found or v_request.status<>'approved' then raise exception 'purge_not_approved'; end if;
  select * into v_asset from public.media_assets where id=v_request.asset_id for update;
  if not found then raise exception 'asset_not_found'; end if;
  if v_asset.legal_hold or v_asset.publication_status<>'quarantined' or v_asset.retention_expires_at is null or v_asset.retention_expires_at>now() then raise exception 'asset_not_disposal_eligible'; end if;
  if exists(select 1 from public.entity_media where asset_id=v_asset.id) or exists(select 1 from public.media_asset_links where asset_id=v_asset.id and link_status in ('pending','active')) then raise exception 'active_links_block_purge'; end if;
  select coalesce(jsonb_agg(distinct x),'[]'::jsonb) into v_objects from (
    select jsonb_build_object('bucket',case when v_asset.technical_report->>'migration'='038_phase3_legacy_entity_media_backfill' then 'public-media' else 'media-quarantine' end,'path',v_asset.original_storage_path) x
    union all select jsonb_build_object('bucket','media-derivatives','path',v_asset.sanitized_storage_path) where v_asset.sanitized_storage_path is not null
    union all select jsonb_build_object('bucket','public-media','path',v_asset.published_storage_path) where v_asset.published_storage_path is not null
  ) s;
  update public.media_purge_requests set status='executing',execution_started_at=now() where id=p_request_id;
  return jsonb_build_object('request_id',p_request_id,'asset_id',v_asset.id,'objects',v_objects);
end $$;

create or replace function public.admin_media_fail_purge_execution(p_request_id uuid,p_storage_result jsonb)
returns void language plpgsql security invoker set search_path='' as $$
declare v_actor uuid:=auth.uid();
begin
  if v_actor is null or not (select private.is_staff(array['admin']::public.staff_role[])) then raise exception 'admin_required' using errcode='42501'; end if;
  update public.media_purge_requests set status='approved',execution_started_at=null,execution_result=p_storage_result where id=p_request_id and status='executing';
end $$;

create or replace function public.admin_media_finalize_purge(p_request_id uuid,p_storage_result jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid(); v_request public.media_purge_requests%rowtype; v_asset public.media_assets%rowtype; v_relations jsonb;
begin
  if v_actor is null or not (select private.is_staff(array['admin']::public.staff_role[])) then raise exception 'admin_required' using errcode='42501'; end if;
  select * into v_request from public.media_purge_requests where id=p_request_id for update;
  if not found or v_request.status<>'executing' then raise exception 'purge_not_executing'; end if;
  if coalesce((p_storage_result->>'complete')::boolean,false) is not true then raise exception 'storage_purge_incomplete'; end if;
  select * into v_asset from public.media_assets where id=v_request.asset_id for update;
  if v_asset.legal_hold or exists(select 1 from public.entity_media where asset_id=v_asset.id) or exists(select 1 from public.media_asset_links where asset_id=v_asset.id and link_status in ('pending','active')) then raise exception 'asset_no_longer_disposal_eligible'; end if;
  if exists(select 1 from public.media_assets where duplicate_of_asset_id=v_asset.id) then raise exception 'dependent_duplicates_block_purge'; end if;
  select jsonb_build_object(
    'links',coalesce((select jsonb_agg(to_jsonb(x)) from public.media_asset_links x where x.asset_id=v_asset.id),'[]'::jsonb),
    'rights',coalesce((select jsonb_agg(to_jsonb(x)) from public.media_rights_assertions x where x.asset_id=v_asset.id),'[]'::jsonb),
    'events',coalesce((select jsonb_agg(to_jsonb(x)) from public.media_ingestion_events x where x.asset_id=v_asset.id),'[]'::jsonb),
    'entity_media',coalesce((select jsonb_agg(to_jsonb(x)) from public.entity_media x where x.asset_id=v_asset.id),'[]'::jsonb),
    'legal_cases',coalesce((select jsonb_agg(to_jsonb(x)) from public.media_legal_case_assets x where x.asset_id=v_asset.id),'[]'::jsonb),
    'purge_requests',coalesce((select jsonb_agg(to_jsonb(x)) from public.media_purge_requests x where x.asset_id=v_asset.id),'[]'::jsonb)
  ) into v_relations;
  insert into public.media_asset_disposal_audit(asset_id,purge_request_id,asset_snapshot,relations_snapshot,storage_result,disposed_by)
  values(v_asset.id,p_request_id,to_jsonb(v_asset),v_relations,p_storage_result,v_actor);
  insert into public.audit_events(actor_user_id,action,entity_table,entity_id,before_data,after_data,source)
  values(v_actor,'permanent_media_asset_purge','media_assets',v_asset.id::text,to_jsonb(v_asset),jsonb_build_object('purge_request_id',p_request_id,'storage_result',p_storage_result),'media_lifecycle_v1');
  delete from public.media_legal_case_assets where asset_id=v_asset.id;
  delete from public.media_ingestion_events where asset_id=v_asset.id or upload_intent_id=v_asset.id;
  delete from public.media_rights_assertions where asset_id=v_asset.id;
  delete from public.media_asset_links where asset_id=v_asset.id;
  delete from public.entity_media where asset_id=v_asset.id;
  delete from public.media_purge_requests where asset_id=v_asset.id;
  delete from public.media_assets where id=v_asset.id;
  delete from public.media_upload_intents where id=v_asset.id;
  return jsonb_build_object('purged',true,'asset_id',v_asset.id,'audit_retained',true);
end $$;

drop policy if exists media_quarantine_disposal_delete on storage.objects;
create policy media_quarantine_disposal_delete on storage.objects for delete to authenticated using (
  bucket_id='media-quarantine' and (select private.is_staff(array['admin']::public.staff_role[])) and exists(
    select 1 from public.media_assets a join public.media_purge_requests p on p.asset_id=a.id
    where p.status='executing' and a.original_storage_path=name));
drop policy if exists media_derivatives_disposal_delete on storage.objects;
create policy media_derivatives_disposal_delete on storage.objects for delete to authenticated using (
  bucket_id='media-derivatives' and (select private.is_staff(array['admin']::public.staff_role[])) and exists(
    select 1 from public.media_assets a join public.media_purge_requests p on p.asset_id=a.id
    where p.status='executing' and a.sanitized_storage_path=name));
drop policy if exists public_media_disposal_delete on storage.objects;
create policy public_media_disposal_delete on storage.objects for delete to authenticated using (
  bucket_id='public-media' and (select private.is_staff(array['admin']::public.staff_role[])) and exists(
    select 1 from public.media_assets a join public.media_purge_requests p on p.asset_id=a.id
    where p.status='executing' and (a.published_storage_path=name or (a.technical_report->>'migration'='038_phase3_legacy_entity_media_backfill' and a.original_storage_path=name))));

revoke all on function public.admin_media_vault_action(text,uuid[],jsonb) from public,anon;
grant execute on function public.admin_media_vault_action(text,uuid[],jsonb) to authenticated;
revoke all on function public.admin_media_prepare_purge(uuid) from public,anon;
revoke all on function public.admin_media_fail_purge_execution(uuid,jsonb) from public,anon;
revoke all on function public.admin_media_finalize_purge(uuid,jsonb) from public,anon;
grant execute on function public.admin_media_prepare_purge(uuid) to authenticated;
grant execute on function public.admin_media_fail_purge_execution(uuid,jsonb) to authenticated;
grant execute on function public.admin_media_finalize_purge(uuid,jsonb) to authenticated;

comment on view public.media_asset_lifecycle is 'Authoritative, time-aware lifecycle projection. Retention eligibility cannot drift because it is derived from retention_expires_at at read time.';
comment on table public.media_asset_disposal_audit is 'Immutable tombstone retaining the approval, relational snapshot and storage deletion evidence after permanent asset purge.';
commit;

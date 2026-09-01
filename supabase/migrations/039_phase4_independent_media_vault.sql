-- Coffee Platform V1 — Phase 4 independent, asset-centric Media Vault.
-- Adds audited bulk metadata, quarantine, unlink and purge-request workflows.
begin;

alter table public.media_assets
  drop constraint if exists media_assets_publication_status_check;
alter table public.media_assets
  add constraint media_assets_publication_status_check
  check (publication_status in ('private','ready_for_review','publishing','published','restricted','quarantined','rejected','archived'));

create table public.media_purge_requests (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.media_assets(id) on delete restrict,
  reason text not null check (length(trim(reason)) between 10 and 1000),
  status text not null default 'pending' check (status in ('pending','approved','rejected','cancelled','executed')),
  requested_by uuid not null references public.profiles(id) on delete restrict,
  requested_at timestamptz not null default now(),
  reviewed_by uuid references public.profiles(id) on delete restrict,
  reviewed_at timestamptz,
  review_note text,
  executed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status in ('approved','rejected')) = (reviewed_at is not null) or status in ('pending','cancelled','executed')),
  check ((status = 'executed') = (executed_at is not null))
);
create unique index media_purge_requests_one_pending_idx
  on public.media_purge_requests(asset_id) where status='pending';
create index media_purge_requests_queue_idx
  on public.media_purge_requests(status,requested_at);

alter table public.media_purge_requests enable row level security;
grant select,insert,update on public.media_purge_requests to authenticated;
create policy media_purge_requests_staff_all on public.media_purge_requests
  for all to authenticated
  using ((select private.is_staff()))
  with check ((select private.is_staff()));
create trigger set_media_purge_requests_updated_at before update on public.media_purge_requests
  for each row execute function private.set_updated_at();

create or replace function public.admin_media_vault_action(
  p_action text,
  p_asset_ids uuid[],
  p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_actor uuid := auth.uid();
  v_role text;
  v_asset public.media_assets%rowtype;
  v_previous text;
  v_next text;
  v_reason text := trim(coalesce(p_payload->>'reason',''));
  v_alt_ar text := nullif(trim(p_payload->>'alt_ar'),'');
  v_caption_ar text := nullif(trim(p_payload->>'caption_ar'),'');
  v_operator_note text := nullif(trim(p_payload->>'operator_note'),'');
  v_count integer := 0;
begin
  if v_actor is null or not (select private.is_staff()) then
    raise exception 'staff_required' using errcode='42501';
  end if;
  select role::text into v_role from public.profiles where id=v_actor and is_active;
  if coalesce(cardinality(p_asset_ids),0) < 1 or cardinality(p_asset_ids) > 100 then
    raise exception 'asset_selection_required';
  end if;
  if (select count(*) from public.media_assets where id=any(p_asset_ids)) <> cardinality(p_asset_ids) then
    raise exception 'asset_not_found';
  end if;
  if p_action in ('quarantine','restore') and v_role not in ('verifier','admin') then
    raise exception 'reviewer_required' using errcode='42501';
  end if;
  if p_action in ('unlink','request_purge') and v_role <> 'admin' then
    raise exception 'admin_required' using errcode='42501';
  end if;

  for v_asset in
    select * from public.media_assets where id=any(p_asset_ids) order by id for update
  loop
    v_previous := v_asset.publication_status;
    v_next := v_previous;

    if p_action='quarantine' then
      if v_asset.publication_status='quarantined' then continue; end if;
      update public.media_assets
      set publication_status='quarantined',
          restricted_at=coalesce(restricted_at,now()),
          technical_report=technical_report || jsonb_build_object(
            'phase4_previous_publication_status',v_asset.publication_status,
            'phase4_quarantine_reason',left(v_reason,1000),
            'phase4_quarantined_by',v_actor,
            'phase4_quarantined_at',now()
          )
      where id=v_asset.id;
      update public.media_asset_links
      set link_status='suppressed'
      where asset_id=v_asset.id and link_status in ('pending','active');
      v_next := 'quarantined';

    elsif p_action='restore' then
      if v_asset.publication_status<>'quarantined' then raise exception 'asset_not_quarantined'; end if;
      v_next := coalesce(v_asset.technical_report->>'phase4_previous_publication_status','private');
      if v_next not in ('private','ready_for_review','published','restricted','rejected','archived') then v_next:='private'; end if;
      if v_next='published' and (v_asset.published_storage_path is null or v_asset.published_at is null) then v_next:='private'; end if;
      update public.media_assets
      set publication_status=v_next, restricted_at=case when v_next='restricted' then restricted_at else null end,
          technical_report=technical_report || jsonb_build_object('phase4_restored_by',v_actor,'phase4_restored_at',now())
      where id=v_asset.id;
      update public.media_asset_links
      set link_status=case when v_next='published' then 'active' else 'pending' end
      where asset_id=v_asset.id and link_status='suppressed'
        and updated_at >= v_asset.restricted_at;

    elsif p_action='unlink' then
      update public.media_asset_links
      set link_status='removed',is_primary=false
      where asset_id=v_asset.id and link_status<>'removed';
      v_next := 'unlinked';

    elsif p_action='update_metadata' then
      if v_alt_ar is null and v_caption_ar is null and v_operator_note is null then
        raise exception 'metadata_required';
      end if;
      if v_alt_ar is not null and length(v_alt_ar)<2 then raise exception 'invalid_alt_text'; end if;
      update public.media_asset_links
      set alt_ar=coalesce(v_alt_ar,alt_ar),caption_ar=coalesce(v_caption_ar,caption_ar)
      where asset_id=v_asset.id and link_status<>'removed';
      update public.media_assets
      set technical_report=technical_report || jsonb_strip_nulls(jsonb_build_object(
        'operator_note',v_operator_note,
        'metadata_updated_by',v_actor,
        'metadata_updated_at',now()
      ))
      where id=v_asset.id;
      v_next := 'metadata_updated';

    elsif p_action='request_purge' then
      if length(v_reason)<10 then raise exception 'purge_reason_required'; end if;
      if v_asset.legal_hold then raise exception 'legal_hold_blocks_purge'; end if;
      if v_asset.publication_status not in ('quarantined','archived') then raise exception 'quarantine_required_before_purge'; end if;
      if v_asset.restricted_at is null or v_asset.restricted_at > now()-interval '30 days' then raise exception 'retention_period_active'; end if;
      if exists(select 1 from public.media_asset_links where asset_id=v_asset.id and link_status in ('pending','active')) then
        raise exception 'active_links_block_purge';
      end if;
      insert into public.media_purge_requests(asset_id,reason,requested_by)
      values(v_asset.id,left(v_reason,1000),v_actor)
      on conflict (asset_id) where status='pending' do nothing;
      v_next := 'purge_requested';
    else
      raise exception 'invalid_media_vault_action';
    end if;

    insert into public.media_ingestion_events(
      asset_id,event_type,previous_state,next_state,actor_user_id,
      policy_version,correlation_id,technical_report
    ) values (
      v_asset.id,'phase4_'||p_action,upper(v_previous),upper(v_next),v_actor,
      'phase4-v1',gen_random_uuid(),jsonb_build_object('payload',p_payload,'source','independent_media_vault')
    );
    v_count := v_count+1;
  end loop;
  return jsonb_build_object('action',p_action,'affected',v_count,'asset_ids',p_asset_ids);
end $$;

revoke all on function public.admin_media_vault_action(text,uuid[],jsonb) from public,anon;
grant execute on function public.admin_media_vault_action(text,uuid[],jsonb) to authenticated;

comment on table public.media_purge_requests is
  'Governed requests only. Phase 4 never deletes storage objects directly from search results.';
comment on function public.admin_media_vault_action(text,uuid[],jsonb) is
  'Atomic, role-checked and append-only-audited Media Vault bulk action service.';

commit;


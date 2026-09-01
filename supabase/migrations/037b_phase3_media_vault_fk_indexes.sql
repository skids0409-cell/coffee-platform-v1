-- Coffee Platform V1 — Phase 3 postflight FK indexes
begin;
create index media_upload_intents_attested_by_idx on public.media_upload_intents(attested_by);
create index media_upload_intents_uploaded_by_status_idx on public.media_upload_intents(uploaded_by,status,created_at desc);
create index media_assets_uploaded_by_idx on public.media_assets(uploaded_by);
create index media_assets_approved_by_idx on public.media_assets(approved_by) where approved_by is not null;
create index media_asset_links_linked_by_idx on public.media_asset_links(linked_by);
create index media_rights_assertions_attested_by_idx on public.media_rights_assertions(attested_by);
create index media_rights_assertions_reviewed_by_idx on public.media_rights_assertions(reviewed_by) where reviewed_by is not null;
create index media_ingestion_events_actor_idx on public.media_ingestion_events(actor_user_id) where actor_user_id is not null;
create index media_legal_cases_submitted_by_idx on public.media_legal_cases(submitted_by) where submitted_by is not null;
create index media_legal_cases_assigned_to_idx on public.media_legal_cases(assigned_to) where assigned_to is not null;
create index media_legal_case_assets_asset_idx on public.media_legal_case_assets(asset_id);
create index media_legal_case_events_actor_idx on public.media_legal_case_events(actor_user_id) where actor_user_id is not null;
commit;


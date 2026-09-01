alter function public.admin_create_brand_draft(jsonb) security invoker;
alter function public.admin_create_catalog_draft(text,jsonb) security invoker;
alter function public.admin_delete_catalog_record(text,uuid) security invoker;
alter function public.admin_replace_product_attributes(uuid,jsonb) security invoker;
alter function public.import_organization_intake_batch(uuid) security invoker;

create index if not exists organization_memberships_approved_by_idx on public.organization_memberships(approved_by) where approved_by is not null;
create index if not exists partner_submissions_reviewed_by_idx on public.partner_submissions(reviewed_by) where reviewed_by is not null;
create index if not exists entity_media_created_by_idx on public.entity_media(created_by) where created_by is not null;
create index if not exists entity_media_source_record_id_idx on public.entity_media(source_record_id) where source_record_id is not null;

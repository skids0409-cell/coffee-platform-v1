-- Public media is readable only while its parent catalog record is published.
begin;
drop policy if exists entity_media_public_read on public.entity_media;
create policy entity_media_public_read on public.entity_media for select to anon,authenticated
using (
  (entity_table='products' and exists(select 1 from public.products p where p.id=entity_id and p.status='published')) or
  (entity_table='organizations' and exists(select 1 from public.organizations o where o.id=entity_id and o.status='published')) or
  (entity_table='brands' and exists(select 1 from public.brands b where b.id=entity_id and b.status='published')) or
  (entity_table='offers' and exists(select 1 from public.offers f where f.id=entity_id and f.status='published')) or
  (entity_table='contents' and exists(select 1 from public.contents c where c.id=entity_id and c.status='published')) or
  (entity_table='origin_claims' and exists(select 1 from public.origin_claims oc where oc.id=entity_id and oc.status='published'))
);
grant select on public.entity_media to anon;
commit;

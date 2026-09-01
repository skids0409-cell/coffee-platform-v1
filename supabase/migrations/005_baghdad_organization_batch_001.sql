-- Coffee Platform V1 — Baghdad organization intake Batch 001
-- Version: 1.0.0 | Date: 2026-08-09
-- Imports eight source-checked organizations as in_review. Nothing is published.
begin;
do $$ begin if to_regclass('public.data_import_batches') is null then raise exception 'Migration 003 must be completed before 005'; end if; if (select count(*) from public.profiles where role='admin' and is_active) <> 1 then raise exception 'Migration 005 requires exactly one active admin profile'; end if; end $$;
alter table public.source_records add column if not exists source_key text;
create unique index if not exists source_records_source_key_unique on public.source_records(source_key) where source_key is not null;
alter table public.locations add column if not exists source_key text;
alter table public.locations add column if not exists phone text;
create unique index if not exists locations_source_key_unique on public.locations(source_key) where source_key is not null;
alter table public.data_quality_issues add column if not exists recommended_action text;
alter table public.data_quality_issues add column if not exists issue_type text;
create unique index if not exists data_quality_issues_code_unique on public.data_quality_issues(issue_code);
create table if not exists public.entity_source_links (
  id uuid primary key default gen_random_uuid(),
  entity_table text not null check (entity_table in ('organizations','locations','products','offers','contents')),
  entity_id uuid not null,
  source_record_id uuid not null references public.source_records(id) on delete cascade,
  claim_scope text[] not null default '{}',
  is_primary boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (entity_table, entity_id, source_record_id)
);
create index if not exists entity_source_links_entity_idx on public.entity_source_links(entity_table,entity_id);
alter table public.entity_source_links enable row level security;
grant select,insert,update,delete on public.entity_source_links to authenticated;
drop policy if exists entity_source_links_staff_all on public.entity_source_links;
create policy entity_source_links_staff_all on public.entity_source_links for all to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));
insert into public.source_records (source_key,title,source_type,url,publisher,accessed_at,license_note,evidence_excerpt) values
  ('SRC-BGD-001','بُن رضا علوان — الموقع الرسمي','organization','https://ridhaalwancoffee.com/ar/','Ridha Alwan Coffee','2026-08-09T00:00:00Z','Facts only; no media copied','official_organization: Identity, roaster role, contact, five Baghdad addresses'),
  ('SRC-BGD-002','Locus — official Baghdad branches','organization','https://locu.life/','Locus','2026-08-09T00:00:00Z','Facts only; no media copied','official_organization: Identity, cafe role, three Baghdad branches and phones'),
  ('SRC-BGD-003','Garam Cafe — contact/about','organization','https://garamcafe.com/contact','Garam Cafe','2026-08-09T00:00:00Z','Facts only; no media copied','official_organization: Identity, contact, Baghdad address'),
  ('SRC-BGD-004','Mr. Kim''s Cafe — official site','organization','https://mrkimscafe.com/','Mr. Kim''s Cafe','2026-08-09T00:00:00Z','Facts only; no media copied','official_organization: Identity, cafe role, address, phone, hours'),
  ('SRC-BGD-005','Kshta — official contact and services','organization','https://kshtaiq.com/pages/contact','Kshta','2026-08-09T00:00:00Z','Facts only; no media copied','official_organization: Identity, equipment sales/services, phone, Yarmouk showroom'),
  ('SRC-BGD-006','Italian Coffee Store — contact','organization','https://italiancoffee-co.com/en/contact-us','Italian Coffee Store Company','2026-08-09T00:00:00Z','Facts only; no media copied','official_organization: Identity, Baghdad office, equipment/coffee retail, phone'),
  ('SRC-BGD-007','Nespresso Iraq — official site','manufacturer','https://www.nespresso.com/iq/en/','Nespresso','2026-08-09T00:00:00Z','Facts only; no media copied','official_manufacturer_market_site: Iraq catalog, Baghdad boutiques, contact'),
  ('SRC-BGD-008','Sumer Land — official site/contact','organization','https://www.slco.com.iq/','Sumer Land Co.','2026-08-09T00:00:00Z','Facts only; no media copied','official_organization: Baghdad base, importing/distribution, equipment and services'),
  ('SRC-BGD-009','Shaghf Iraq — LinkedIn company page','organization','https://www.linkedin.com/company/shaghf-iraq','Shaghf Iraq','2026-08-09T00:00:00Z','Facts only; no media copied','organization_controlled_social: Candidate identity and Baghdad headquarters only'),
  ('SRC-BGD-010','Espressolab Baghdad — official Instagram target','other','https://www.instagram.com/espressolabbaghdad/','Espressolab Baghdad','2026-08-09T00:00:00Z','No data copied from mirror','not_directly_verified: Candidate handle only; direct official capture required')
on conflict (source_key) where source_key is not null do update set title=excluded.title,source_type=excluded.source_type,url=excluded.url,publisher=excluded.publisher,accessed_at=excluded.accessed_at,license_note=excluded.license_note,evidence_excerpt=excluded.evidence_excerpt;
insert into public.data_import_batches (batch_code,entity_type,market_id,source_label,status,total_rows,valid_rows,rejected_rows,created_by,imported_by,imported_at)
select 'BGD-ORG-001','organization',m.id,'Baghdad organization research Batch 001','imported',10,8,2,a.id,a.id,now()
from public.markets m cross join lateral (select id from public.profiles where role='admin' and is_active order by created_at limit 1) a
where m.code='IQ-BGD'
on conflict (batch_code) do update set status=excluded.status,total_rows=excluded.total_rows,valid_rows=excluded.valid_rows,rejected_rows=excluded.rejected_rows,imported_by=excluded.imported_by,imported_at=excluded.imported_at;
with seed(slug,name_ar,name_en,website_url,phone,email,verification_tier,status,source_checked_at,organization_code,source_key) as (values
  ('ridha-alwan-coffee','بُن رضا علوان','Ridha Alwan Coffee','https://ridhaalwancoffee.com/ar/','+9647810601960','info@ridhaalwancoffee.com','t2_source_checked','in_review','2026-08-09T00:00:00Z','ORG-BGD-001','SRC-BGD-001'),
  ('locus-coffee-iraq','لوكاس','Locus Specialty Coffee','https://locu.life/','+9647734442225',null,'t2_source_checked','in_review','2026-08-09T00:00:00Z','ORG-BGD-002','SRC-BGD-002'),
  ('garam-cafe','مقهى غرام','Garam Cafe','https://garamcafe.com/','+9647710080801','info@garamcafe.com','t2_source_checked','in_review','2026-08-09T00:00:00Z','ORG-BGD-003','SRC-BGD-003'),
  ('mr-kims-cafe','مقهى مستر كيم','Mr. Kim''s Cafe','https://mrkimscafe.com/','+9647750060011',null,'t2_source_checked','in_review','2026-08-09T00:00:00Z','ORG-BGD-004','SRC-BGD-004'),
  ('kshta-coffee-tools','كشتة لأدوات القهوة','Kshta Coffee Tools','https://kshtaiq.com/','+9647838299905','info@kshtaiq.com','t2_source_checked','in_review','2026-08-09T00:00:00Z','ORG-BGD-005','SRC-BGD-005'),
  ('italian-coffee-store-iraq','المتجر الإيطالي للقهوة','Italian Coffee Store Company','https://italiancoffee-co.com/','+9647502210221',null,'t2_source_checked','in_review','2026-08-09T00:00:00Z','ORG-BGD-006','SRC-BGD-006'),
  ('nespresso-iraq','نسبرسو العراق','Nespresso Iraq','https://www.nespresso.com/iq/en/','+9647878650000',null,'t2_source_checked','in_review','2026-08-09T00:00:00Z','ORG-BGD-007','SRC-BGD-007'),
  ('sumer-land','شركة أرض سومر','Sumer Land Co.','https://www.slco.com.iq/','+9647730606061','info@slco.com.iq','t2_source_checked','in_review','2026-08-09T00:00:00Z','ORG-BGD-008','SRC-BGD-008')
)
insert into public.organizations (slug,name_ar,name_en,website_url,phone,email,verification_tier,status,source_checked_at,created_by)
select s.slug,s.name_ar,s.name_en,s.website_url,s.phone,s.email,s.verification_tier::public.verification_tier,s.status::public.publication_status,s.source_checked_at::timestamptz,a.id
from seed s cross join lateral (select id from public.profiles where role='admin' and is_active order by created_at limit 1) a
on conflict (slug) do update set name_ar=excluded.name_ar,name_en=excluded.name_en,website_url=excluded.website_url,phone=excluded.phone,email=excluded.email,verification_tier=excluded.verification_tier,status='in_review',source_checked_at=excluded.source_checked_at;
with seed(slug,role_type,is_primary) as (values
  ('ridha-alwan-coffee','roaster',true),
  ('ridha-alwan-coffee','cafe',false),
  ('ridha-alwan-coffee','seller',false),
  ('locus-coffee-iraq','cafe',true),
  ('garam-cafe','cafe',true),
  ('mr-kims-cafe','cafe',true),
  ('kshta-coffee-tools','equipment_supplier',true),
  ('kshta-coffee-tools','seller',false),
  ('kshta-coffee-tools','service_provider',false),
  ('italian-coffee-store-iraq','equipment_supplier',true),
  ('italian-coffee-store-iraq','seller',false),
  ('nespresso-iraq','equipment_supplier',true),
  ('nespresso-iraq','seller',false),
  ('sumer-land','equipment_supplier',true),
  ('sumer-land','importer',false),
  ('sumer-land','service_provider',false)
)
insert into public.organization_roles (organization_id,role_type,is_primary)
select o.id,s.role_type::public.organization_role_type,s.is_primary from seed s join public.organizations o on o.slug=s.slug
on conflict (organization_id,role_type) do update set is_primary=excluded.is_primary;
with seed(source_key,organization_slug,name_ar,name_en,address_ar,address_en,phone,source_record_key) as (values
  ('LOC-BGD-001','ridha-alwan-coffee','كرادة داخل','Karrada Inside','كرادة داخل - قرب محطة وقود أبو أقلام','Karrada Inside, near Abu Aqlam fuel station',null,'SRC-BGD-001'),
  ('LOC-BGD-002','ridha-alwan-coffee','زيونة','Zayouna','زيونة - قرب تقاطع جسر الربيعي','Zayouna, near Al-Rubaie Bridge intersection',null,'SRC-BGD-001'),
  ('LOC-BGD-003','ridha-alwan-coffee','الأعظمية','Adhamiya','الأعظمية - شارع الضباط','Adhamiya, Al-Dhubat Street',null,'SRC-BGD-001'),
  ('LOC-BGD-004','ridha-alwan-coffee','كرادة شرقية - نقطة بيع','Karrada Sharqiya Sales Point','كرادة شرقية - نقطة بيع مباشر (جملة ومفرد)','Karrada Sharqiya direct wholesale and retail point',null,'SRC-BGD-001'),
  ('LOC-BGD-005','ridha-alwan-coffee','حي الجامعة','Al-Jamiaa','حي الجامعة - شارع الربيع','Al-Jamiaa, Al-Rabee Street',null,'SRC-BGD-001'),
  ('LOC-BGD-006','locus-coffee-iraq','المنصور','Mansour','المنصور، بغداد','Mansour, Baghdad','+9647734442225','SRC-BGD-002'),
  ('LOC-BGD-007','locus-coffee-iraq','شارع فلسطين','Palestine Street','شارع فلسطين، بغداد','Palestine Street, Baghdad','+9647755441152','SRC-BGD-002'),
  ('LOC-BGD-008','locus-coffee-iraq','الأعظمية','Adhamiya','الأعظمية، بغداد','Adhamiya, Baghdad','+9647755447745','SRC-BGD-002'),
  ('LOC-BGD-009','garam-cafe','اليرموك','Yarmouk','مبنى مقهى غرام، الشارع الرابع، اليرموك','Garam Cafe Building, Yarmouk 4th Street','+9647710080801','SRC-BGD-003'),
  ('LOC-BGD-010','mr-kims-cafe','الصليخ','Saliqh','الصليخ، شارع 600، بغداد','Saliqh, 600 Street, Baghdad','+9647750060011','SRC-BGD-004'),
  ('LOC-BGD-011','kshta-coffee-tools','اليرموك','Yarmouk','اليرموك، مدخل شارع جامع الشواف، مقابل مستر كومبيوتر، داخل محمصة جبران','Yarmouk, Al-Shawaf Mosque street entrance, opposite Mr Computer, inside Jubran Roastery','+9647838299905','SRC-BGD-005'),
  ('LOC-BGD-012','italian-coffee-store-iraq','معسكر الرشيد','Rashid Camp','بغداد، معسكر الرشيد 931-7','Baghdad, Rashid Camp 931-7','+9647502210221','SRC-BGD-006'),
  ('LOC-BGD-013','nespresso-iraq','الجادرية مول','Al Jadriya Mall','الجادرية مول، الطابق الأرضي، بغداد','Al Jadriya Mall, ground floor, Baghdad',null,'SRC-BGD-007'),
  ('LOC-BGD-014','nespresso-iraq','عراق مول','Iraq Mall','عراق مول، الطابق الأرضي، بغداد','Iraq Mall, ground floor, Baghdad',null,'SRC-BGD-007'),
  ('LOC-BGD-015','sumer-land','السيدية','Al-Saydiya','العراق، بغداد، السيدية','Iraq, Baghdad, Al-Saydiya','+9647730606061','SRC-BGD-008')
)
insert into public.locations (source_key,organization_id,market_id,name_ar,name_en,address_ar,address_en,phone,status)
select s.source_key,o.id,m.id,s.name_ar,s.name_en,s.address_ar,s.address_en,s.phone,'in_review'
from seed s join public.organizations o on o.slug=s.organization_slug join public.markets m on m.code='IQ-BGD'
on conflict (source_key) where source_key is not null do update set organization_id=excluded.organization_id,market_id=excluded.market_id,name_ar=excluded.name_ar,name_en=excluded.name_en,address_ar=excluded.address_ar,address_en=excluded.address_en,phone=excluded.phone,status='in_review';
with seed(source_row_number,dedupe_key,raw_payload,normalized_payload,validation_status,validation_messages,target_slug) as (values
  (1,'ORG-BGD-001','{"organization_code":"ORG-BGD-001","name_ar":"بُن رضا علوان","name_en":"Ridha Alwan Coffee","roles":["roaster","cafe","seller"],"website_url":"https://ridhaalwancoffee.com/ar/","phone":"+9647810601960","email":"info@ridhaalwancoffee.com","source_key":"SRC-BGD-001","accessed_at":"2026-08-09","evidence_note":"Official site identifies a Baghdad roastery founded in 1960 and lists Baghdad branches."}'::jsonb,'{"slug":"ridha-alwan-coffee","name_ar":"بُن رضا علوان","name_en":"Ridha Alwan Coffee","roles":["roaster","cafe","seller"],"website_url":"https://ridhaalwancoffee.com/ar/","phone":"+9647810601960","email":"info@ridhaalwancoffee.com","verification_tier":"t2_source_checked","canonical_status":"in_review","intake_decision":"ready_for_import"}'::jsonb,'imported','[]'::jsonb,'ridha-alwan-coffee'),
  (2,'ORG-BGD-002','{"organization_code":"ORG-BGD-002","name_ar":"لوكاس","name_en":"Locus Specialty Coffee","roles":["cafe"],"website_url":"https://locu.life/","phone":"+9647734442225","email":null,"source_key":"SRC-BGD-002","accessed_at":"2026-08-09","evidence_note":"Official site lists three active Baghdad branches."}'::jsonb,'{"slug":"locus-coffee-iraq","name_ar":"لوكاس","name_en":"Locus Specialty Coffee","roles":["cafe"],"website_url":"https://locu.life/","phone":"+9647734442225","email":null,"verification_tier":"t2_source_checked","canonical_status":"in_review","intake_decision":"ready_for_import"}'::jsonb,'imported','[]'::jsonb,'locus-coffee-iraq'),
  (3,'ORG-BGD-003','{"organization_code":"ORG-BGD-003","name_ar":"مقهى غرام","name_en":"Garam Cafe","roles":["cafe"],"website_url":"https://garamcafe.com/","phone":"+9647710080801","email":"info@garamcafe.com","source_key":"SRC-BGD-003","accessed_at":"2026-08-09","evidence_note":"Official company and contact pages confirm Baghdad headquarters and café operation."}'::jsonb,'{"slug":"garam-cafe","name_ar":"مقهى غرام","name_en":"Garam Cafe","roles":["cafe"],"website_url":"https://garamcafe.com/","phone":"+9647710080801","email":"info@garamcafe.com","verification_tier":"t2_source_checked","canonical_status":"in_review","intake_decision":"ready_for_import"}'::jsonb,'imported','[]'::jsonb,'garam-cafe'),
  (4,'ORG-BGD-004','{"organization_code":"ORG-BGD-004","name_ar":"مقهى مستر كيم","name_en":"Mr. Kim''s Cafe","roles":["cafe"],"website_url":"https://mrkimscafe.com/","phone":"+9647750060011","email":null,"source_key":"SRC-BGD-004","accessed_at":"2026-08-09","evidence_note":"Official bilingual site provides Baghdad address, phone, and hours."}'::jsonb,'{"slug":"mr-kims-cafe","name_ar":"مقهى مستر كيم","name_en":"Mr. Kim''s Cafe","roles":["cafe"],"website_url":"https://mrkimscafe.com/","phone":"+9647750060011","email":null,"verification_tier":"t2_source_checked","canonical_status":"in_review","intake_decision":"ready_for_import"}'::jsonb,'imported','[]'::jsonb,'mr-kims-cafe'),
  (5,'ORG-BGD-005','{"organization_code":"ORG-BGD-005","name_ar":"كشتة لأدوات القهوة","name_en":"Kshta Coffee Tools","roles":["equipment_supplier","seller","service_provider"],"website_url":"https://kshtaiq.com/","phone":"+9647838299905","email":"info@kshtaiq.com","source_key":"SRC-BGD-005","accessed_at":"2026-08-09","evidence_note":"Official store documents equipment retail, wholesale, training, consulting, and a Baghdad showroom."}'::jsonb,'{"slug":"kshta-coffee-tools","name_ar":"كشتة لأدوات القهوة","name_en":"Kshta Coffee Tools","roles":["equipment_supplier","seller","service_provider"],"website_url":"https://kshtaiq.com/","phone":"+9647838299905","email":"info@kshtaiq.com","verification_tier":"t2_source_checked","canonical_status":"in_review","intake_decision":"ready_for_import"}'::jsonb,'imported','[]'::jsonb,'kshta-coffee-tools'),
  (6,'ORG-BGD-006','{"organization_code":"ORG-BGD-006","name_ar":"المتجر الإيطالي للقهوة","name_en":"Italian Coffee Store Company","roles":["equipment_supplier","seller"],"website_url":"https://italiancoffee-co.com/","phone":"+9647502210221","email":null,"source_key":"SRC-BGD-006","accessed_at":"2026-08-09","evidence_note":"Official contact and catalog pages confirm Baghdad office and coffee/equipment sales."}'::jsonb,'{"slug":"italian-coffee-store-iraq","name_ar":"المتجر الإيطالي للقهوة","name_en":"Italian Coffee Store Company","roles":["equipment_supplier","seller"],"website_url":"https://italiancoffee-co.com/","phone":"+9647502210221","email":null,"verification_tier":"t2_source_checked","canonical_status":"in_review","intake_decision":"ready_for_import"}'::jsonb,'imported','[]'::jsonb,'italian-coffee-store-iraq'),
  (7,'ORG-BGD-007','{"organization_code":"ORG-BGD-007","name_ar":"نسبرسو العراق","name_en":"Nespresso Iraq","roles":["equipment_supplier","seller"],"website_url":"https://www.nespresso.com/iq/en/","phone":"+9647878650000","email":null,"source_key":"SRC-BGD-007","accessed_at":"2026-08-09","evidence_note":"Official Iraq site lists products and two Baghdad boutiques."}'::jsonb,'{"slug":"nespresso-iraq","name_ar":"نسبرسو العراق","name_en":"Nespresso Iraq","roles":["equipment_supplier","seller"],"website_url":"https://www.nespresso.com/iq/en/","phone":"+9647878650000","email":null,"verification_tier":"t2_source_checked","canonical_status":"in_review","intake_decision":"ready_for_import"}'::jsonb,'imported','[]'::jsonb,'nespresso-iraq'),
  (8,'ORG-BGD-008','{"organization_code":"ORG-BGD-008","name_ar":"شركة أرض سومر","name_en":"Sumer Land Co.","roles":["equipment_supplier","importer","service_provider"],"website_url":"https://www.slco.com.iq/","phone":"+9647730606061","email":"info@slco.com.iq","source_key":"SRC-BGD-008","accessed_at":"2026-08-09","evidence_note":"Official site confirms Baghdad base, importing/distributing machines, supplies, and service."}'::jsonb,'{"slug":"sumer-land","name_ar":"شركة أرض سومر","name_en":"Sumer Land Co.","roles":["equipment_supplier","importer","service_provider"],"website_url":"https://www.slco.com.iq/","phone":"+9647730606061","email":"info@slco.com.iq","verification_tier":"t2_source_checked","canonical_status":"in_review","intake_decision":"ready_for_import"}'::jsonb,'imported','[]'::jsonb,'sumer-land'),
  (9,'ORG-BGD-009','{"organization_code":"ORG-BGD-009","name_ar":"شغف العراق","name_en":"Shaghf Iraq","roles":["cafe"],"website_url":"https://www.linkedin.com/company/shaghf-iraq","phone":null,"email":null,"source_key":"SRC-BGD-009","accessed_at":"2026-08-09","evidence_note":"Organization-controlled LinkedIn page indicates Baghdad headquarters; exact branches require direct confirmation."}'::jsonb,'{"slug":"shaghf-iraq","name_ar":"شغف العراق","name_en":"Shaghf Iraq","roles":["cafe"],"website_url":"https://www.linkedin.com/company/shaghf-iraq","phone":null,"email":null,"verification_tier":"t1_unverified","canonical_status":"draft","intake_decision":"hold_for_confirmation"}'::jsonb,'invalid','["Official-source confirmation required"]'::jsonb,null),
  (10,'ORG-BGD-010','{"organization_code":"ORG-BGD-010","name_ar":"إسبريسو لاب بغداد","name_en":"Espressolab Baghdad","roles":["cafe"],"website_url":"https://www.instagram.com/espressolabbaghdad/","phone":null,"email":null,"source_key":"SRC-BGD-010","accessed_at":"2026-08-09","evidence_note":"Search surfaced a third-party Instagram mirror; official accessible evidence must be captured before import."}'::jsonb,'{"slug":"espressolab-baghdad","name_ar":"إسبريسو لاب بغداد","name_en":"Espressolab Baghdad","roles":["cafe"],"website_url":"https://www.instagram.com/espressolabbaghdad/","phone":null,"email":null,"verification_tier":"t1_unverified","canonical_status":"draft","intake_decision":"hold_for_official_source"}'::jsonb,'invalid','["Official-source confirmation required"]'::jsonb,null)
)
insert into public.data_intake_rows (batch_id,source_row_number,dedupe_key,raw_payload,normalized_payload,validation_status,validation_messages,target_table,target_id,reviewed_by,reviewed_at)
select b.id,s.source_row_number,s.dedupe_key,s.raw_payload,s.normalized_payload,s.validation_status,s.validation_messages,case when s.target_slug is null then null else 'organizations' end,o.id,a.id,now()
from seed s cross join public.data_import_batches b
cross join lateral (select id from public.profiles where role='admin' and is_active order by created_at limit 1) a
left join public.organizations o on o.slug=s.target_slug
where b.batch_code='BGD-ORG-001'
on conflict (batch_id,source_row_number) do update set dedupe_key=excluded.dedupe_key,raw_payload=excluded.raw_payload,normalized_payload=excluded.normalized_payload,validation_status=excluded.validation_status,validation_messages=excluded.validation_messages,target_table=excluded.target_table,target_id=excluded.target_id,reviewed_by=excluded.reviewed_by,reviewed_at=excluded.reviewed_at;
insert into public.entity_source_links (entity_table,entity_id,source_record_id,claim_scope,is_primary,created_by)
select 'organizations',o.id,sr.id,array['identity','roles','contact','location'],true,a.id
from public.organizations o
join (values ('ridha-alwan-coffee','SRC-BGD-001'),('locus-coffee-iraq','SRC-BGD-002'),('garam-cafe','SRC-BGD-003'),('mr-kims-cafe','SRC-BGD-004'),('kshta-coffee-tools','SRC-BGD-005'),('italian-coffee-store-iraq','SRC-BGD-006'),('nespresso-iraq','SRC-BGD-007'),('sumer-land','SRC-BGD-008')) v(slug,source_key) on v.slug=o.slug
join public.source_records sr on sr.source_key=v.source_key
cross join lateral (select id from public.profiles where role='admin' and is_active order by created_at limit 1) a
on conflict (entity_table,entity_id,source_record_id) do update set claim_scope=excluded.claim_scope,is_primary=excluded.is_primary;
insert into public.entity_source_links (entity_table,entity_id,source_record_id,claim_scope,is_primary,created_by)
select 'locations',l.id,sr.id,array['address'],true,a.id
from public.locations l
join (values ('LOC-BGD-001','SRC-BGD-001'),('LOC-BGD-002','SRC-BGD-001'),('LOC-BGD-003','SRC-BGD-001'),('LOC-BGD-004','SRC-BGD-001'),('LOC-BGD-005','SRC-BGD-001'),('LOC-BGD-006','SRC-BGD-002'),('LOC-BGD-007','SRC-BGD-002'),('LOC-BGD-008','SRC-BGD-002'),('LOC-BGD-009','SRC-BGD-003'),('LOC-BGD-010','SRC-BGD-004'),('LOC-BGD-011','SRC-BGD-005'),('LOC-BGD-012','SRC-BGD-006'),('LOC-BGD-013','SRC-BGD-007'),('LOC-BGD-014','SRC-BGD-007'),('LOC-BGD-015','SRC-BGD-008')) v(location_key,source_key) on v.location_key=l.source_key
join public.source_records sr on sr.source_key=v.source_key
cross join lateral (select id from public.profiles where role='admin' and is_active order by created_at limit 1) a
on conflict (entity_table,entity_id,source_record_id) do update set claim_scope=excluded.claim_scope,is_primary=excluded.is_primary;
with seed(issue_code,organization_code,issue_type,severity,field_code,message_ar,recommended_action,status) as (values
  ('DQ-BGD-001','ORG-BGD-005','source_template_contamination','high','address','صفحة اتصال كشتة تعرض عنواناً أسترالياً افتراضياً، بينما تذييل الموقع يكرر عنوان اليرموك.','Use repeated Yarmouk footer address; never import the template address.','open'),
  ('DQ-BGD-002','ORG-BGD-006','conflicting_phone_numbers','medium','phone','تختلف أرقام Italian Coffee بين صفحات ونسخ اللغة.','Use the current English contact page number and confirm by direct call before publication.','open'),
  ('DQ-BGD-003','ORG-BGD-001','ambiguous_opening_hours','low','opening_hours','صياغة ساعات العمل في الموقع غير واضحة.','Do not import hours until confirmed per branch.','open'),
  ('DQ-BGD-004','ORG-BGD-003','unsupported_marketing_claim','medium','certification','ورد ادعاء شهادة جودة في صفحة الشركة دون وثيقة تحقق مستقلة ضمن المواد المتاحة.','Exclude certification claim until certificate evidence is obtained.','open'),
  ('DQ-BGD-005','ORG-BGD-009','missing_official_branch_evidence','high','locations','لا تتوفر عناوين فروع رسمية قابلة للتحقق في المصدر الحالي.','Hold canonical import and request official branch evidence.','open'),
  ('DQ-BGD-006','ORG-BGD-010','third_party_only','high','source','المعلومة المتاحة في نتائج البحث جاءت عبر مرآة غير رسمية.','Hold canonical import until official source is captured.','open')
)
insert into public.data_quality_issues (intake_row_id,entity_table,entity_id,issue_code,issue_type,severity,field_code,message_ar,recommended_action,status)
select ir.id,case when o.id is null then null else 'organizations' end,o.id,s.issue_code,s.issue_type,s.severity,s.field_code,s.message_ar,s.recommended_action,s.status
from seed s join public.data_import_batches b on b.batch_code='BGD-ORG-001' join public.data_intake_rows ir on ir.batch_id=b.id and ir.dedupe_key=s.organization_code left join public.organizations o on o.slug=(ir.normalized_payload->>'slug')
on conflict (issue_code) do update set intake_row_id=excluded.intake_row_id,entity_table=excluded.entity_table,entity_id=excluded.entity_id,issue_type=excluded.issue_type,severity=excluded.severity,field_code=excluded.field_code,message_ar=excluded.message_ar,recommended_action=excluded.recommended_action,status=excluded.status;
insert into public.audit_events (actor_user_id,action,entity_table,entity_id,after_data,source)
select a.id,'import_baghdad_batch_001','data_import_batches',b.id::text,jsonb_build_object('batch_code',b.batch_code,'organizations_in_review',8,'held_candidates',2),'migration_005'
from public.data_import_batches b cross join lateral (select id from public.profiles where role='admin' and is_active order by created_at limit 1) a
where b.batch_code='BGD-ORG-001' and not exists (select 1 from public.audit_events e where e.action='import_baghdad_batch_001' and e.entity_id=b.id::text);
commit;
select
  (select count(*) from public.source_records where source_key like 'SRC-BGD-%') as source_records,
  (select count(*) from public.data_intake_rows ir join public.data_import_batches b on b.id=ir.batch_id where b.batch_code='BGD-ORG-001') as candidate_rows,
  (select count(*) from public.organizations where slug in ('ridha-alwan-coffee','locus-coffee-iraq','garam-cafe','mr-kims-cafe','kshta-coffee-tools','italian-coffee-store-iraq','nespresso-iraq','sumer-land')) as organizations_in_review,
  (select count(*) from public.locations where source_key like 'LOC-BGD-%') as locations_in_review,
  (select count(*) from public.organizations where slug in ('ridha-alwan-coffee','locus-coffee-iraq','garam-cafe','mr-kims-cafe','kshta-coffee-tools','italian-coffee-store-iraq','nespresso-iraq','sumer-land') and status='published') as accidentally_published,
  2 as held_candidates;

-- Coffee Platform V1 — Baghdad product intake Batch 001
-- Version: 1.0.0 | Date: 2026-08-09
-- Three equipment products and two local offers are imported as in_review.
-- Fellow Opus remains intake-only because the exact model is unresolved.
-- Nothing is published. Green coffee is excluded.

begin;

do $$
begin
  if to_regclass('public.data_import_batches') is null then raise exception 'Migration 003 must be completed before 009'; end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='source_records' and column_name='source_key') then raise exception 'Migration 005 must be completed before 009'; end if;
  if (select count(*) from public.profiles where role='admin' and is_active) <> 1 then raise exception 'Migration 009 requires exactly one active admin profile'; end if;
  if (select count(*) from public.categories where code in ('EQP-GRD-MAN','EQP-GRD-ELE','EQP-ROA-COM')) <> 3 then raise exception 'Required V1 equipment categories are missing'; end if;
  if not exists (select 1 from public.organizations where slug='kshta-coffee-tools') then raise exception 'Kshta seller record is required for Baghdad offers'; end if;
end
$$;

insert into public.source_records (source_key,title,source_type,url,publisher,accessed_at,license_note,evidence_excerpt) values
  ('SRC-PRD-001','DF54 Coffee Grinder — official product page','manufacturer','https://dfgrinders.com/products/df54-coffee-grinder','DF Grinders','2026-08-09T00:00:00Z','Facts only; no media copied','Manufacturer specifications for the DF54 V4 grinder.'),
  ('SRC-PRD-002','DF54 Coffee Grinder — Kshta seller page','seller','https://kshtaiq.com/products/df54-coffee-grinder','Kshta Coffee Tools','2026-08-09T00:00:00Z','Facts and observed price only; no media copied','Baghdad-market seller offer and locally stated specifications.'),
  ('SRC-PRD-003','J-Ultra Manual Coffee Grinder — official product page','manufacturer','https://1zpresso.coffee/product/jultra/','1Zpresso','2026-08-09T00:00:00Z','Facts only; no media copied','Manufacturer specifications for J-Ultra.'),
  ('SRC-PRD-004','1Zpresso J-Ultra — Kshta seller page','seller','https://kshtaiq.com/products/1zpresso-j-ultra-manual-coffee-grinder-copy','Kshta Coffee Tools','2026-08-09T00:00:00Z','Facts and observed price only; no media copied','Baghdad-market offer; seller capacity and weight conflict with manufacturer figures.'),
  ('SRC-PRD-005','Kuban Supreme 3 kg Coffee Roaster — official product page','manufacturer','https://kubancoffeeroasters.com/product/3-kg-coffee-roaster/','Kuban Coffee Roasters','2026-08-09T00:00:00Z','Facts only; no media copied','Manufacturer specifications for the Supreme 3 kg commercial batch roaster.'),
  ('SRC-PRD-006','Fellow Opus — Kshta seller page','seller','https://kshtaiq.com/products/fellow-opus-conical-burr-coffee-grinder-%D9%81%D9%8A%D9%84%D9%88-%D9%85%D8%B7%D8%AD%D9%86%D9%87-%D9%83%D9%87%D8%B1%D8%A8%D8%A7%D8%A6%D9%8A%D8%A9-copy-2','Kshta Coffee Tools','2026-08-09T00:00:00Z','Facts only; no media copied','Seller page appears to describe the original 40 mm Opus model.'),
  ('SRC-PRD-007','Fellow Opus 2 — current official product page','manufacturer','https://fellowproducts.com/products/opus-2-conical-burr-grinder','Fellow Products','2026-08-09T00:00:00Z','Facts only; no media copied','Current manufacturer page describes Opus 2; equivalence with the seller listing is not established.')
on conflict (source_key) where source_key is not null do update set title=excluded.title,source_type=excluded.source_type,url=excluded.url,publisher=excluded.publisher,accessed_at=excluded.accessed_at,license_note=excluded.license_note,evidence_excerpt=excluded.evidence_excerpt;

insert into public.data_import_batches (batch_code,entity_type,market_id,source_label,status,total_rows,valid_rows,rejected_rows,created_by,imported_by,imported_at)
select 'BGD-PRD-001','product',m.id,'Baghdad product research Batch 001','imported',4,3,1,a.id,a.id,now()
from public.markets m cross join lateral (select id from public.profiles where role='admin' and is_active order by created_at limit 1) a
where m.code='IQ-BGD'
on conflict (batch_code) do update set status=excluded.status,total_rows=excluded.total_rows,valid_rows=excluded.valid_rows,rejected_rows=excluded.rejected_rows,imported_by=excluded.imported_by,imported_at=excluded.imported_at;

with seed(slug,name_ar,name_en,website_url) as (values
  ('df-grinders','دي إف جريندرز','DF Grinders','https://dfgrinders.com/'),
  ('1zpresso','ون زبريسو','1Zpresso','https://1zpresso.coffee/'),
  ('kuban','كوبان','Kuban','https://kubancoffeeroasters.com/')
)
insert into public.brands (slug,name_ar,name_en,website_url,status)
select slug,name_ar,name_en,website_url,'in_review' from seed
on conflict (slug) do update set name_ar=excluded.name_ar,name_en=excluded.name_en,website_url=excluded.website_url,status='in_review';

with seed(slug,name_ar,name_en,summary_ar,summary_en,description_ar,description_en,brand_slug,model_number) as (values
  ('df54-v4-coffee-grinder','مطحنة القهوة DF54 V4','DF54 V4 Coffee Grinder','مطحنة كهربائية أحادية الجرعة بشفرات مسطحة 54 مم وضبط تدريجي دون درجات.','Single-dose electric grinder with 54 mm flat burrs and stepless adjustment.','تعتمد المواصفات الأساسية على الشركة المصنّعة. السعر المحلي مسجل كعرض منفصل قيد المراجعة.','Canonical specifications come from the manufacturer. The local price is a separate in-review offer.','df-grinders','DF54 V4'),
  ('1zpresso-j-ultra','مطحنة 1Zpresso J-Ultra اليدوية','1Zpresso J-Ultra Manual Grinder','مطحنة يدوية بشفرات مخروطية 48 مم وضبط بمقدار 8 ميكرون لكل نقرة، محسّنة للإسبريسو.','Manual grinder with 48 mm conical burrs and 8-micron-per-click adjustment, optimized for espresso.','اعتمدت مواصفات الشركة المصنّعة، وسُجّل تعارض أرقام البائع المحلي في سجل جودة البيانات.','Manufacturer specifications are canonical; conflicting seller figures are recorded as a data-quality issue.','1zpresso','J-Ultra'),
  ('kuban-supreme-3','ماكينة تحميص كوبان سوبريم 3','Kuban Supreme 3 Coffee Roaster','ماكينة تحميص تجارية بسعة قصوى 3 كغم وإنتاج معلن يصل إلى 12 كغم/ساعة.','Commercial batch roaster with a 3 kg maximum batch and stated output up to 12 kg/hour.','المنتج موثق من الشركة المصنّعة، ولا تدعي هذه الدفعة وجود عرض أو مورد موثق في بغداد.','Manufacturer-documented product; this batch does not claim a verified Baghdad seller or offer.','kuban','Supreme 3')
)
insert into public.products (slug,name_ar,name_en,summary_ar,summary_en,description_ar,description_en,product_kind,brand_id,model_number,verification_tier,status,source_checked_at,created_by)
select s.slug,s.name_ar,s.name_en,s.summary_ar,s.summary_en,s.description_ar,s.description_en,'equipment',b.id,s.model_number,'t2_source_checked','in_review','2026-08-09T00:00:00Z',a.id
from seed s join public.brands b on b.slug=s.brand_slug cross join lateral (select id from public.profiles where role='admin' and is_active order by created_at limit 1) a
on conflict (slug) do update set name_ar=excluded.name_ar,name_en=excluded.name_en,summary_ar=excluded.summary_ar,summary_en=excluded.summary_en,description_ar=excluded.description_ar,description_en=excluded.description_en,product_kind=excluded.product_kind,brand_id=excluded.brand_id,model_number=excluded.model_number,verification_tier=excluded.verification_tier,status='in_review',source_checked_at=excluded.source_checked_at,published_at=null;

with seed(product_slug,category_code) as (values
  ('df54-v4-coffee-grinder','EQP-GRD-ELE'),
  ('1zpresso-j-ultra','EQP-GRD-MAN'),
  ('kuban-supreme-3','EQP-ROA-COM')
)
insert into public.product_categories (product_id,category_id,is_primary)
select p.id,c.id,true from seed s join public.products p on p.slug=s.product_slug join public.categories c on c.code=s.category_code
on conflict (product_id,category_id) do update set is_primary=true;

with seed(product_slug,field_code,value_text,value_decimal,value_json,unit_code,source_key) as (values
  ('df54-v4-coffee-grinder','grinder_drive','electric',null,null,null,'SRC-PRD-001'),
  ('df54-v4-coffee-grinder','brew_methods',null,null,'["espresso","filter","french_press"]'::jsonb,null,'SRC-PRD-001'),
  ('df54-v4-coffee-grinder','burr_mechanism','burr',null,null,null,'SRC-PRD-001'),
  ('df54-v4-coffee-grinder','burr_geometry','flat',null,null,null,'SRC-PRD-001'),
  ('df54-v4-coffee-grinder','adjustment','stepless',null,null,null,'SRC-PRD-001'),
  ('df54-v4-coffee-grinder','feeding','single_dose',null,null,null,'SRC-PRD-001'),
  ('df54-v4-coffee-grinder','burr_size_mm',null,54,null,'mm','SRC-PRD-001'),
  ('df54-v4-coffee-grinder','capacity_g',null,25,null,'g','SRC-PRD-001'),
  ('1zpresso-j-ultra','grinder_drive','manual',null,null,null,'SRC-PRD-003'),
  ('1zpresso-j-ultra','brew_methods',null,null,'["espresso"]'::jsonb,null,'SRC-PRD-003'),
  ('1zpresso-j-ultra','burr_mechanism','burr',null,null,null,'SRC-PRD-003'),
  ('1zpresso-j-ultra','burr_geometry','conical',null,null,null,'SRC-PRD-003'),
  ('1zpresso-j-ultra','adjustment','stepped',null,null,null,'SRC-PRD-003'),
  ('1zpresso-j-ultra','feeding','single_dose',null,null,null,'SRC-PRD-003'),
  ('1zpresso-j-ultra','burr_size_mm',null,48,null,'mm','SRC-PRD-003'),
  ('1zpresso-j-ultra','capacity_g',null,40,null,'g','SRC-PRD-003'),
  ('kuban-supreme-3','roaster_technology','drum',null,null,null,'SRC-PRD-005'),
  ('kuban-supreme-3','roaster_use_class','commercial_batch',null,null,null,'SRC-PRD-005'),
  ('kuban-supreme-3','rated_power',null,1.84,null,'kW','SRC-PRD-005')
)
insert into public.product_attribute_values (product_id,field_definition_id,value_text,value_decimal,value_json,unit_code,source_record_id,observed_at)
select p.id,f.id,s.value_text,s.value_decimal,s.value_json,s.unit_code,sr.id,'2026-08-09T00:00:00Z'
from seed s join public.products p on p.slug=s.product_slug join public.field_definitions f on f.code=s.field_code join public.source_records sr on sr.source_key=s.source_key
on conflict (product_id,field_definition_id) do update set value_text=excluded.value_text,value_integer=null,value_decimal=excluded.value_decimal,value_boolean=null,value_date=null,value_json=excluded.value_json,unit_code=excluded.unit_code,source_record_id=excluded.source_record_id,observed_at=excluded.observed_at;

insert into public.roaster_specifications (product_id,application,heat_source,batch_min_kg,batch_max_kg,production_kg_per_hour,control_level,power_supply,gas_type,exhaust_requirements,dimensions_mm,weight_kg,warranty_months,source_record_id,source_checked_at)
select p.id,array['commercial'],'dual_fuel',null,3,12,'assisted','220–380 V; 50–60 Hz','LPG or natural gas; configuration dependent','Integrated cyclone; site-specific exhaust design must be confirmed',jsonb_build_object('width',1040,'height',1220,'depth',1670,'unit','mm'),310,null,sr.id,'2026-08-09T00:00:00Z'
from public.products p join public.source_records sr on sr.source_key='SRC-PRD-005' where p.slug='kuban-supreme-3'
on conflict (product_id) do update set application=excluded.application,heat_source=excluded.heat_source,batch_min_kg=excluded.batch_min_kg,batch_max_kg=excluded.batch_max_kg,production_kg_per_hour=excluded.production_kg_per_hour,control_level=excluded.control_level,power_supply=excluded.power_supply,gas_type=excluded.gas_type,exhaust_requirements=excluded.exhaust_requirements,dimensions_mm=excluded.dimensions_mm,weight_kg=excluded.weight_kg,warranty_months=excluded.warranty_months,source_record_id=excluded.source_record_id,source_checked_at=excluded.source_checked_at;

with seed(product_slug,price,external_url,source_key) as (values
  ('df54-v4-coffee-grinder',325250::numeric,'https://kshtaiq.com/products/df54-coffee-grinder','SRC-PRD-002'),
  ('1zpresso-j-ultra',438000::numeric,'https://kshtaiq.com/products/1zpresso-j-ultra-manual-coffee-grinder-copy','SRC-PRD-004')
)
update public.offers o set price=s.price,currency_code='IQD',availability='unknown',observed_at='2026-08-09T00:00:00Z',source_record_id=sr.id,status='in_review'
from seed s join public.products p on p.slug=s.product_slug join public.organizations seller on seller.slug='kshta-coffee-tools' join public.markets m on m.code='IQ-BGD' join public.source_records sr on sr.source_key=s.source_key
where o.product_id=p.id and o.seller_organization_id=seller.id and o.market_id=m.id and o.external_url=s.external_url;

with seed(product_slug,price,external_url,source_key) as (values
  ('df54-v4-coffee-grinder',325250::numeric,'https://kshtaiq.com/products/df54-coffee-grinder','SRC-PRD-002'),
  ('1zpresso-j-ultra',438000::numeric,'https://kshtaiq.com/products/1zpresso-j-ultra-manual-coffee-grinder-copy','SRC-PRD-004')
)
insert into public.offers (product_id,seller_organization_id,market_id,price,currency_code,availability,external_url,observed_at,source_record_id,status)
select p.id,seller.id,m.id,s.price,'IQD','unknown',s.external_url,'2026-08-09T00:00:00Z',sr.id,'in_review'
from seed s join public.products p on p.slug=s.product_slug join public.organizations seller on seller.slug='kshta-coffee-tools' join public.markets m on m.code='IQ-BGD' join public.source_records sr on sr.source_key=s.source_key
where not exists (select 1 from public.offers o where o.product_id=p.id and o.seller_organization_id=seller.id and o.market_id=m.id and o.external_url=s.external_url);

with seed(source_row_number,dedupe_key,raw_payload,normalized_payload,validation_status,validation_messages,target_slug) as (values
  (1,'PRD-BGD-001',jsonb_build_object('name','DF54 Coffee Grinder','manufacturer_source','SRC-PRD-001','seller_source','SRC-PRD-002','seller_price_iqd',325250,'seller_weight_kg',4.5,'seller_dimensions_cm','17.8 × 11.4 × 30.5'),jsonb_build_object('slug','df54-v4-coffee-grinder','brand','DF Grinders','model_number','DF54 V4','category_code','EQP-GRD-ELE','canonical_source','SRC-PRD-001','status','in_review'),'imported','["Seller dimensions and weight differ slightly from manufacturer figures; manufacturer is canonical."]'::jsonb,'df54-v4-coffee-grinder'),
  (2,'PRD-BGD-002',jsonb_build_object('name','1Zpresso J-Ultra','manufacturer_source','SRC-PRD-003','seller_source','SRC-PRD-004','seller_price_iqd',438000,'seller_capacity_g','18–20','seller_weight_g',700),jsonb_build_object('slug','1zpresso-j-ultra','brand','1Zpresso','model_number','J-Ultra','category_code','EQP-GRD-MAN','canonical_capacity_g','35–40','canonical_weight_g',670,'status','in_review'),'imported','["Seller capacity and weight conflict with the manufacturer; manufacturer values are canonical."]'::jsonb,'1zpresso-j-ultra'),
  (3,'PRD-BGD-003',jsonb_build_object('name','Kuban Supreme 3','manufacturer_source','SRC-PRD-005','verified_baghdad_offer',false),jsonb_build_object('slug','kuban-supreme-3','brand','Kuban','model_number','Supreme 3','category_code','EQP-ROA-COM','status','in_review','offer_status','none_verified'),'imported','["No Baghdad seller or local service claim is attached."]'::jsonb,'kuban-supreme-3'),
  (4,'PRD-BGD-004',jsonb_build_object('name','Fellow Opus','seller_source','SRC-PRD-006','current_manufacturer_source','SRC-PRD-007','seller_burr_mm',40,'current_official_model','Opus 2'),jsonb_build_object('candidate_slug','fellow-opus','decision','hold_for_exact_model_verification','canonical_status','draft'),'invalid','["Original Opus and current Opus 2 must not be merged without exact model evidence."]'::jsonb,null)
)
insert into public.data_intake_rows (batch_id,source_row_number,dedupe_key,raw_payload,normalized_payload,validation_status,validation_messages,target_table,target_id,reviewed_by,reviewed_at)
select b.id,s.source_row_number,s.dedupe_key,s.raw_payload,s.normalized_payload,s.validation_status,s.validation_messages,case when p.id is null then null else 'products' end,p.id,a.id,now()
from seed s join public.data_import_batches b on b.batch_code='BGD-PRD-001' cross join lateral (select id from public.profiles where role='admin' and is_active order by created_at limit 1) a left join public.products p on p.slug=s.target_slug
on conflict (batch_id,source_row_number) do update set dedupe_key=excluded.dedupe_key,raw_payload=excluded.raw_payload,normalized_payload=excluded.normalized_payload,validation_status=excluded.validation_status,validation_messages=excluded.validation_messages,target_table=excluded.target_table,target_id=excluded.target_id,reviewed_by=excluded.reviewed_by,reviewed_at=excluded.reviewed_at;

with seed(product_slug,source_key,claim_scope,is_primary) as (values
  ('df54-v4-coffee-grinder','SRC-PRD-001',array['identity','model','technical_specifications'],true),
  ('df54-v4-coffee-grinder','SRC-PRD-002',array['local_offer','seller_claims'],false),
  ('1zpresso-j-ultra','SRC-PRD-003',array['identity','model','technical_specifications'],true),
  ('1zpresso-j-ultra','SRC-PRD-004',array['local_offer','seller_claims'],false),
  ('kuban-supreme-3','SRC-PRD-005',array['identity','model','technical_specifications'],true)
)
insert into public.entity_source_links (entity_table,entity_id,source_record_id,claim_scope,is_primary,created_by)
select 'products',p.id,sr.id,s.claim_scope,s.is_primary,a.id from seed s join public.products p on p.slug=s.product_slug join public.source_records sr on sr.source_key=s.source_key cross join lateral (select id from public.profiles where role='admin' and is_active order by created_at limit 1) a
on conflict (entity_table,entity_id,source_record_id) do update set claim_scope=excluded.claim_scope,is_primary=excluded.is_primary;

insert into public.entity_source_links (entity_table,entity_id,source_record_id,claim_scope,is_primary,created_by)
select 'offers',o.id,sr.id,array['price','currency','external_url','observed_at'],true,a.id
from public.offers o join public.source_records sr on sr.id=o.source_record_id join public.products p on p.id=o.product_id and p.slug in ('df54-v4-coffee-grinder','1zpresso-j-ultra') cross join lateral (select id from public.profiles where role='admin' and is_active order by created_at limit 1) a
on conflict (entity_table,entity_id,source_record_id) do update set claim_scope=excluded.claim_scope,is_primary=excluded.is_primary;

with seed(issue_code,dedupe_key,issue_type,severity,field_code,message_ar,message_en,recommended_action,status) as (values
  ('DQ-PRD-001','PRD-BGD-001','conflicting_product_specifications','medium','dimensions_weight','تختلف أبعاد ووزن DF54 في صفحة البائع قليلاً عن مواصفات الشركة المصنّعة.','Seller dimensions and weight differ slightly from manufacturer specifications.','Keep manufacturer specifications canonical; use the seller page only for the dated local offer.','open'),
  ('DQ-PRD-002','PRD-BGD-002','conflicting_product_specifications','high','capacity_weight','تذكر صفحة البائع سعة 18–20 غراماً ووزناً يقارب 700 غرام، بينما تذكر الشركة المصنّعة سعة 35–40 غراماً ووزناً 670 غراماً.','Seller states 18–20 g and about 700 g, while the manufacturer states 35–40 g and 670 g.','Use manufacturer figures and request seller confirmation before publication.','open'),
  ('DQ-PRD-003','PRD-BGD-004','model_version_conflict','high','model_number','لا يمكن إثبات أن عرض Fellow Opus المحلي يخص المنتج الحالي Fellow Opus 2؛ المواصفات تشير إلى نسختين مختلفتين.','The local Fellow Opus listing cannot be proven equivalent to the current Fellow Opus 2.','Hold canonical creation until direct evidence identifies the exact version.','open'),
  ('DQ-PRD-004','PRD-BGD-003','missing_local_offer','high','market_availability','لم يُعثر في هذه الدفعة على بائع أو صيانة موثقة في بغداد لماكينة Kuban Supreme 3.','No verified Baghdad seller or service source was found for Kuban Supreme 3.','Keep in review without a Baghdad offer; verify importer, installation, warranty and parts before publication.','open')
)
insert into public.data_quality_issues (intake_row_id,entity_table,entity_id,issue_code,issue_type,severity,field_code,message_ar,message_en,recommended_action,status)
select ir.id,case when p.id is null then null else 'products' end,p.id,s.issue_code,s.issue_type,s.severity,s.field_code,s.message_ar,s.message_en,s.recommended_action,s.status
from seed s join public.data_import_batches b on b.batch_code='BGD-PRD-001' join public.data_intake_rows ir on ir.batch_id=b.id and ir.dedupe_key=s.dedupe_key left join public.products p on p.id=ir.target_id
on conflict (issue_code) do update set intake_row_id=excluded.intake_row_id,entity_table=excluded.entity_table,entity_id=excluded.entity_id,issue_type=excluded.issue_type,severity=excluded.severity,field_code=excluded.field_code,message_ar=excluded.message_ar,message_en=excluded.message_en,recommended_action=excluded.recommended_action,status=excluded.status;

insert into public.audit_events (actor_user_id,action,entity_table,entity_id,after_data,source)
select a.id,'import_baghdad_product_batch_001','data_import_batches',b.id::text,jsonb_build_object('batch_code',b.batch_code,'products_in_review',3,'offers_in_review',2,'held_candidates',1,'published',0),'migration_009'
from public.data_import_batches b cross join lateral (select id from public.profiles where role='admin' and is_active order by created_at limit 1) a
where b.batch_code='BGD-PRD-001' and not exists (select 1 from public.audit_events e where e.action='import_baghdad_product_batch_001' and e.entity_id=b.id::text);

commit;

select
  (select count(*) from public.source_records where source_key like 'SRC-PRD-%') as source_records,
  (select count(*) from public.data_intake_rows ir join public.data_import_batches b on b.id=ir.batch_id where b.batch_code='BGD-PRD-001') as candidate_rows,
  (select count(*) from public.products where slug in ('df54-v4-coffee-grinder','1zpresso-j-ultra','kuban-supreme-3') and status='in_review') as products_in_review,
  (select count(*) from public.offers o join public.products p on p.id=o.product_id where p.slug in ('df54-v4-coffee-grinder','1zpresso-j-ultra') and o.status='in_review') as offers_in_review,
  (select count(*) from public.roaster_specifications rs join public.products p on p.id=rs.product_id where p.slug='kuban-supreme-3') as roaster_specifications,
  (select count(*) from public.products where status='published') as accidentally_published,
  (select count(*) from public.products p join public.product_categories pc on pc.product_id=p.id join public.categories c on c.id=pc.category_id where c.code='COF-GREEN') as green_coffee_products;

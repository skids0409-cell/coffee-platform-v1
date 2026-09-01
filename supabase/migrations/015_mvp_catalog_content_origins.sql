-- Coffee Platform V1 — launch catalog, offers, origins and knowledge
-- Date: 2026-08-17 | Baghdad-first public MVP
-- Facts are linked to dated seller/roaster pages. No media is copied.

begin;

do $$
begin
  if (select count(*) from public.profiles where role='admin' and is_active) <> 1 then
    raise exception 'Migration 015 requires exactly one active admin profile';
  end if;
  if not exists (select 1 from public.markets where code='IQ-BGD') then
    raise exception 'Baghdad market is required';
  end if;
  if not exists (select 1 from public.organizations where slug='jubrancoffee') then
    raise exception 'Published Jubran organization is required';
  end if;
  if not exists (select 1 from public.organizations where slug='kshta-coffee-tools') then
    raise exception 'Kshta seller organization is required';
  end if;
end
$$;

with seed(source_key,title,url,publisher,evidence_excerpt) as (values
  ('SRC-MVP-001','Jubran Ethiopia Bekele','https://jubrancoffee.com/products/jubran-ethiopia-bekele-%D8%AC%D8%A8%D8%B1%D8%A7%D9%86-%D8%A5%D8%AB%D9%8A%D9%88%D8%A8%D9%8A%D8%A7-%D8%A8%D9%8A%D9%83%D9%8A%D9%84%D9%8A-copy','Jubran Specialty Coffee','Product, origin, process, flavor, harvest and offer facts.'),
  ('SRC-MVP-002','Jubran Esperanza Colombia','https://jubrancoffee.com/products/jubran-esperanza-colombia-%D8%AC%D8%A8%D8%B1%D8%A7%D9%86-%D8%A5%D8%B3%D8%A8%D9%8A%D8%B1%D8%A7%D9%86%D8%B2%D8%A7-%D9%83%D9%88%D9%84%D9%88%D9%85%D8%A8%D9%8A%D8%A7-1','Jubran Specialty Coffee','Product, Potosi farm, processing, flavor and offer facts.'),
  ('SRC-MVP-003','Jubran Colombia Meroe','https://jubrancoffee.com/products/jubran-colombia-meroe-%D8%AC%D8%A8%D8%B1%D8%A7%D9%86-%D9%83%D9%88%D9%84%D9%88%D9%85%D8%A8%D9%8A%D8%A7-%D9%85%D8%B1%D9%88%D9%8A-copy','Jubran Specialty Coffee','Product, processing, flavor and offer facts.'),
  ('SRC-MVP-004','Jubran Kenya Koji','https://jubrancoffee.com/products/kenya-koji-%D9%83%D9%8A%D9%86%D9%8A%D8%A7-%D9%83%D9%88%D8%AC%D9%8A','Jubran Specialty Coffee','Product identity and starting-price offer.'),
  ('SRC-MVP-005','Jubran El Salvador Tecapa','https://jubrancoffee.com/products/%D8%A7%D9%84%D8%B3%D9%84%D9%81%D8%A7%D8%AF%D9%88%D8%B1-%D8%AA%D9%8A%D9%83%D8%A7%D8%A8%D8%A7-el-salvador-tecapa-copy','Jubran Specialty Coffee','Product identity and starting-price offer.'),
  ('SRC-MVP-006','Jubran Guatemala Mariano','https://jubrancoffee.com/products/%D8%AC%D9%88%D8%A7%D8%AA%D9%85%D8%A7%D9%84%D8%A7-%D9%85%D8%A7%D8%B1%D9%8A%D8%A7%D9%86%D9%88-guatemala-mariano-1','Jubran Specialty Coffee','Product identity and starting-price offer.'),
  ('SRC-MVP-007','Jubran Phenomena Blend','https://jubrancoffee.com/products/%D8%AC%D8%A8%D8%B1%D8%A7%D9%86-%D9%82%D9%87%D9%88%D8%A9-%D8%A7%D8%B3%D8%A8%D9%8A%D8%B1%D8%B3%D9%88-%D9%81%D9%8A%D9%86%D9%88%D9%85%D9%8A%D9%86%D8%A7-jubran-phenomena-blend','Jubran Specialty Coffee','Espresso blend identity and offer.'),
  ('SRC-MVP-008','Jubran Turkish Specialty Coffee Ethiopia','https://jubrancoffee.com/products/%D9%82%D9%87%D9%88%D8%A9-%D8%AC%D8%A8%D8%B1%D8%A7%D9%86-%D8%AA%D8%B1%D9%83%D9%8A%D9%87-%D9%85%D8%AE%D8%AA%D8%B5%D8%A9-%D8%A5%D8%AB%D9%8A%D9%88%D8%A8%D9%8A%D8%A7-jubran-turkish-specialty-coffee-ethiopia','Jubran Specialty Coffee','Ground Turkish coffee identity and offer.'),
  ('SRC-MVP-009','Jubran Turkish Decaf Ethiopia','https://jubrancoffee.com/products/%D9%82%D9%87%D9%88%D8%A9-%D8%AC%D8%A8%D8%B1%D8%A7%D9%86-%D8%AA%D8%B1%D9%83%D9%8A%D9%87-%D8%AF%D9%8A%D9%83%D8%A7%D9%81-%D8%A5%D8%AB%D9%8A%D9%88%D8%A8%D9%8A%D8%A7-jubran-turkish-specialty-coffee-decaf-ethiopia','Jubran Specialty Coffee','Ground decaf Turkish coffee identity and offer.'),
  ('SRC-MVP-010','Jubran Peru Swiss Water Decaf','https://jubrancoffee.com/products/%D8%A8%D9%8A%D8%B1%D9%88-%D8%B3%D9%88%D9%8A%D8%B3-%D9%88%D8%A7%D8%AA%D8%B1-%D8%AF%D9%8A%D9%83%D8%A7%D9%81-peru-swiss-water-decaf-copy','Jubran Specialty Coffee','Peru decaf from San Ignacio, Cajamarca and its observed offer.'),
  ('SRC-MVP-011','MHW-3BOMBER Blade R3 Manual Grinder','https://kshtaiq.com/products/mhw-3bomber-blade-r3-manual-grinder-%D8%A8%D9%88%D9%85%D8%A8%D8%B1-%D9%85%D8%B7%D8%AD%D9%86%D8%A9-%D9%82%D9%87%D9%88%D8%A9-%D9%8A%D8%AF%D9%88%D9%8A%D8%A9-1','Kshta Coffee Tools','Seller product identity and conical-burr claim.'),
  ('SRC-MVP-012','Comandante C40 Nitro Blade','https://kshtaiq.com/products/%D9%85%D8%B7%D8%AD%D9%86%D8%A9-%D9%8A%D8%AF%D9%88%D9%8A%D8%A9-%D9%83%D9%88%D9%85%D8%A7%D9%86%D8%AF%D8%A7%D9%86%D8%AA%D9%8A-c40-mk4-%D9%86%D9%8A%D8%AA%D8%B1%D9%88-comandante-c40-mk4-nitro-copy','Kshta Coffee Tools','Seller product identity and capacity claim.'),
  ('SRC-MVP-013','Timemore Sculptor 064S Electric Grinder','https://kshtaiq.com/products/sculptor-064s-electric-coffee-grinder-%D8%AA%D8%A7%D9%8A%D9%85-%D9%85%D9%88%D8%B1-%D9%85%D8%B7%D8%AD%D9%86%D8%A9-%D9%83%D9%87%D8%B1%D8%A8%D8%A7%D8%A6%D9%8A%D8%A9-copy','Kshta Coffee Tools','Seller product identity and adjustment claim.'),
  ('SRC-MVP-014','Hario V60 Ceramic Dripper','https://kshtaiq.com/products/%D9%87%D8%A7%D8%B1%D9%8A%D9%88-v60-%D8%B3%D9%8A%D8%B1%D8%A7%D9%85%D9%8A%D9%83-hario-v60-ceramic-dripper-1','Kshta Coffee Tools','Seller product identity and observed price.'),
  ('SRC-MVP-015','Timemore Coffee Scale Basic 2','https://kshtaiq.com/products/%D9%85%D9%8A%D8%B2%D8%A7%D9%86-%D9%82%D9%87%D9%88%D8%A9-%D8%AA%D8%A7%D9%8A%D9%85-%D9%85%D9%88%D8%B1-timemore-coffee-scale-basic-2-copy','Kshta Coffee Tools','Seller product identity, precision and observed price.'),
  ('SRC-MVP-016','Hario V60 Paper Filters','https://kshtaiq.com/products/%D9%81%D9%84%D8%AA%D8%B1-v60-%D9%85%D9%86-%D9%87%D8%A7%D8%B1%D9%8A%D9%88-hario-v60-filter-2','Kshta Coffee Tools','Seller product identity and pack-size claim.'),
  ('SRC-MVP-017','Arzum Okka Turkish Coffee Machine','https://kshtaiq.com/products/%D9%85%D8%A7%D9%83%D9%86%D8%A9-%D9%82%D9%87%D9%88%D8%A9-%D8%AA%D8%B1%D9%83%D9%8A%D9%87-%D9%85%D9%86-%D8%A7%D9%88%D9%83%D8%A7-okka-turkish-coffee-machine-2','Kshta Coffee Tools','Seller product identity and observed price.'),
  ('SRC-MVP-018','Fellow Aiden Precision Coffee Maker','https://kshtaiq.com/products/fellow-opus-conical-burr-coffee-grinder-%D9%81%D9%8A%D9%84%D9%88-%D9%85%D8%B7%D8%AD%D9%86%D9%87-%D9%83%D9%87%D8%B1%D8%A8%D8%A7%D8%A6%D9%8A%D8%A9-copy','Kshta Coffee Tools','Seller product identity and filter compatibility.'),
  ('SRC-MVP-019','Flair 58 Plus Manual Espresso Maker','https://kshtaiq.com/products/copy-of-flair-neo-flex','Kshta Coffee Tools','Seller product identity and observed price.'),
  ('SRC-MVP-020','Urnex Cafiza E31 Cleaning Tablets','https://kshtaiq.com/products/%D9%85%D9%86%D8%B8%D9%81-%D8%A7%D8%AC%D9%87%D8%B2%D8%A9-%D8%A7%D8%B3%D8%A8%D8%B1%D9%8A%D8%B3%D9%88-%D8%A8%D9%88%D9%84%D9%8A-%D9%83%D8%A7%D9%81-puly-caff-powder-copy','Kshta Coffee Tools','Seller product identity and 100-tablet pack claim.')
)
insert into public.source_records (source_key,title,source_type,url,publisher,accessed_at,license_note,evidence_excerpt)
select source_key,title,'seller',url,publisher,'2026-08-17T00:00:00Z','Facts only; no media copied',evidence_excerpt from seed
on conflict (source_key) where source_key is not null do update set title=excluded.title,url=excluded.url,publisher=excluded.publisher,accessed_at=excluded.accessed_at,evidence_excerpt=excluded.evidence_excerpt;

with seed(slug,name_ar,name_en,website_url) as (values
  ('jubran','جبران','Jubran','https://jubrancoffee.com/'),
  ('mhw-3bomber','إم إتش دبليو 3 بومبر','MHW-3BOMBER','https://mhw3bomber.com/'),
  ('comandante','كوماندانتي','Comandante','https://comandantegrinder.com/'),
  ('timemore','تايم مور','Timemore','https://www.timemore.com/'),
  ('hario','هاريو','Hario','https://global.hario.com/'),
  ('okka','أوكا','Okka','https://arzumokka.com/'),
  ('fellow','فيلو','Fellow','https://fellowproducts.com/'),
  ('flair','فلير','Flair','https://flairespresso.com/'),
  ('urnex','أرنكس','Urnex','https://urnex.com/')
)
insert into public.brands (slug,name_ar,name_en,website_url,status)
select slug,name_ar,name_en,website_url,'published' from seed
on conflict (slug) do update set name_ar=excluded.name_ar,name_en=excluded.name_en,website_url=excluded.website_url,status='published';

update public.brands set status='published' where slug in ('df-grinders','1zpresso');

with seed(slug,name_ar,name_en,summary_ar,product_kind,brand_slug,model_number,owner_slug,category_code,source_key) as (values
  ('jubran-ethiopia-bekele','جبران إثيوبيا بيكيلي','Jubran Ethiopia Bekele','قهوة إثيوبية بمعالجة لاهوائية ونكهات خوخ وفراولة وباشن فروت.','roasted_coffee','jubran','Bekele', 'jubrancoffee','COF-ROASTED','SRC-MVP-001'),
  ('jubran-colombia-esperanza','جبران إسبيرانزا كولومبيا','Jubran Esperanza Colombia','قهوة كولومبية طبيعية من مزرعة بوتوسي بنكهات استوائية وشوكولاتة.','roasted_coffee','jubran','Esperanza','jubrancoffee','COF-ROASTED','SRC-MVP-002'),
  ('jubran-colombia-meroe','جبران كولومبيا مروي','Jubran Colombia Meroe','قهوة فلتر كولومبية مغسولة مع إيحاء البطيخ والشوكولاتة.','roasted_coffee','jubran','Meroe','jubrancoffee','COF-ROASTED','SRC-MVP-003'),
  ('jubran-kenya-koji','جبران كينيا كوجي','Jubran Kenya Koji','محصول كيني أحادي المصدر للتحضير بالفلتر.','roasted_coffee','jubran','Koji','jubrancoffee','COF-ROASTED','SRC-MVP-004'),
  ('jubran-el-salvador-tecapa','جبران السلفادور تيكابا','Jubran El Salvador Tecapa','محصول من السلفادور للتحضير بالفلتر.','roasted_coffee','jubran','Tecapa','jubrancoffee','COF-ROASTED','SRC-MVP-005'),
  ('jubran-guatemala-mariano','جبران جواتيمالا ماريانو','Jubran Guatemala Mariano','محصول جواتيمالي أحادي المصدر للتحضير بالفلتر.','roasted_coffee','jubran','Mariano','jubrancoffee','COF-ROASTED','SRC-MVP-006'),
  ('jubran-phenomena-blend','جبران فينومينا مزيج إسبريسو','Jubran Phenomena Espresso Blend','مزيج محمص للإسبريسو ومشروبات الحليب.','roasted_coffee','jubran','Phenomena','jubrancoffee','COF-ROASTED','SRC-MVP-007'),
  ('jubran-turkish-ethiopia','جبران قهوة تركية مختصة إثيوبيا','Jubran Turkish Specialty Coffee Ethiopia','قهوة إثيوبية مطحونة وجاهزة للتحضير التركي.','roasted_coffee','jubran','Turkish Ethiopia','jubrancoffee','COF-ROASTED','SRC-MVP-008'),
  ('jubran-turkish-decaf-ethiopia','جبران قهوة تركية ديكاف إثيوبيا','Jubran Turkish Decaf Ethiopia','قهوة إثيوبية منزوعة الكافيين، مطحونة للتحضير التركي.','roasted_coffee','jubran','Turkish Decaf','jubrancoffee','COF-ROASTED','SRC-MVP-009'),
  ('jubran-peru-swiss-water-decaf','جبران بيرو سويس ووتر ديكاف','Jubran Peru Swiss Water Decaf','قهوة بيروفية منزوعة الكافيين بطريقة سويس ووتر.','roasted_coffee','jubran','Peru Decaf','jubrancoffee','COF-ROASTED','SRC-MVP-010'),
  ('mhw-blade-r3','مطحنة MHW-3BOMBER Blade R3 اليدوية','MHW-3BOMBER Blade R3 Manual Grinder','مطحنة يدوية بشفرات مخروطية من الستانلس ستيل.','equipment','mhw-3bomber','Blade R3',null,'EQP-GRD-MAN','SRC-MVP-011'),
  ('comandante-c40-nitro-blade','مطحنة كوماندانتي C40 نيترو بليد','Comandante C40 Nitro Blade','مطحنة يدوية بسعة معلنة 40 غراماً.','equipment','comandante','C40',null,'EQP-GRD-MAN','SRC-MVP-012'),
  ('timemore-sculptor-064s','مطحنة تايم مور Sculptor 064S','Timemore Sculptor 064S','مطحنة كهربائية متعددة إعدادات الطحن.','equipment','timemore','064S',null,'EQP-GRD-ELE','SRC-MVP-013'),
  ('hario-v60-ceramic-02','هاريو V60 سيراميك 02','Hario V60 Ceramic 02','مرشح تقطير خزفي على هيئة V60.','equipment','hario','V60 02',null,'EQP-BRW-DRP','SRC-MVP-014'),
  ('timemore-basic-2-scale','ميزان تايم مور Basic 2','Timemore Basic 2 Scale','ميزان قهوة رقمي بدقة 0.1 غرام.','equipment','timemore','Basic 2',null,'EQP-MSR-SCL','SRC-MVP-015'),
  ('hario-v60-paper-filters-100','فلاتر هاريو V60 الورقية 100 قطعة','Hario V60 Paper Filters 100','فلاتر ورقية مخروطية بيضاء بحزم 100 فلتر.','consumable','hario','V60 Paper 100',null,'EQP-FIL-PAP','SRC-MVP-016'),
  ('arzum-okka-ok001','ماكينة قهوة تركية أوكا OK001','Arzum Okka Turkish Coffee Machine OK001','ماكينة كهربائية لتحضير القهوة التركية.','equipment','okka','OK001',null,'EQP-MCH-TRK','SRC-MVP-017'),
  ('fellow-aiden','ماكينة فيلو Aiden للقهوة المفلترة','Fellow Aiden Precision Coffee Maker','ماكينة قهوة مفلترة تدعم مرشحات ميلتا والسلال القياسية.','equipment','fellow','Aiden',null,'EQP-MCH-FLT','SRC-MVP-018'),
  ('flair-58-plus','ماكينة فلير 58 بلس اليدوية','Flair 58 Plus Manual Espresso Maker','ماكينة إسبريسو يدوية بمقاس احترافي 58 مم.','equipment','flair','58 Plus',null,'EQP-MCH-ESP','SRC-MVP-019'),
  ('urnex-cafiza-e31-100','أقراص تنظيف أرنكس كافيزا E31','Urnex Cafiza E31 Cleaning Tablets','مئة قرص بوزن 2 غرام لتنظيف مكائن الإسبريسو.','care_product','urnex','E31',null,'EQP-WCS-CLN','SRC-MVP-020')
)
insert into public.products (slug,name_ar,name_en,summary_ar,description_ar,product_kind,brand_id,owner_organization_id,model_number,verification_tier,status,source_checked_at,published_at,created_by)
select s.slug,s.name_ar,s.name_en,s.summary_ar,'تم التحقق من هوية المنتج والحقائق المعروضة في صفحة المصدر بتاريخ 17 آب 2026. السعر والتوفر يعاملان كسجل عرض مستقل.',s.product_kind,b.id,o.id,s.model_number,'t2_source_checked','published','2026-08-17T00:00:00Z',now(),a.id
from seed s join public.brands b on b.slug=s.brand_slug left join public.organizations o on o.slug=s.owner_slug cross join lateral (select id from public.profiles where role='admin' and is_active order by created_at limit 1) a
on conflict (slug) do update set name_ar=excluded.name_ar,name_en=excluded.name_en,summary_ar=excluded.summary_ar,description_ar=excluded.description_ar,product_kind=excluded.product_kind,brand_id=excluded.brand_id,owner_organization_id=excluded.owner_organization_id,model_number=excluded.model_number,verification_tier=excluded.verification_tier,status='published',source_checked_at=excluded.source_checked_at,published_at=coalesce(public.products.published_at,excluded.published_at);

with seed(product_slug,category_code) as (values
  ('jubran-ethiopia-bekele','COF-ROASTED'),('jubran-colombia-esperanza','COF-ROASTED'),('jubran-colombia-meroe','COF-ROASTED'),('jubran-kenya-koji','COF-ROASTED'),('jubran-el-salvador-tecapa','COF-ROASTED'),('jubran-guatemala-mariano','COF-ROASTED'),('jubran-phenomena-blend','COF-ROASTED'),('jubran-turkish-ethiopia','COF-ROASTED'),('jubran-turkish-decaf-ethiopia','COF-ROASTED'),('jubran-peru-swiss-water-decaf','COF-ROASTED'),
  ('mhw-blade-r3','EQP-GRD-MAN'),('comandante-c40-nitro-blade','EQP-GRD-MAN'),('timemore-sculptor-064s','EQP-GRD-ELE'),('hario-v60-ceramic-02','EQP-BRW-DRP'),('timemore-basic-2-scale','EQP-MSR-SCL'),('hario-v60-paper-filters-100','EQP-FIL-PAP'),('arzum-okka-ok001','EQP-MCH-TRK'),('fellow-aiden','EQP-MCH-FLT'),('flair-58-plus','EQP-MCH-ESP'),('urnex-cafiza-e31-100','EQP-WCS-CLN')
)
insert into public.product_categories (product_id,category_id,is_primary)
select p.id,c.id,true from seed s join public.products p on p.slug=s.product_slug join public.categories c on c.code=s.category_code
on conflict (product_id,category_id) do update set is_primary=true;

with seed(product_slug,source_key,price,seller_slug) as (values
  ('jubran-ethiopia-bekele','SRC-MVP-001',32000::numeric,'jubrancoffee'),('jubran-colombia-esperanza','SRC-MVP-002',34000,'jubrancoffee'),('jubran-colombia-meroe','SRC-MVP-003',23000,'jubrancoffee'),('jubran-kenya-koji','SRC-MVP-004',26000,'jubrancoffee'),('jubran-el-salvador-tecapa','SRC-MVP-005',23000,'jubrancoffee'),('jubran-guatemala-mariano','SRC-MVP-006',26000,'jubrancoffee'),('jubran-phenomena-blend','SRC-MVP-007',25000,'jubrancoffee'),('jubran-turkish-ethiopia','SRC-MVP-008',12000,'jubrancoffee'),('jubran-turkish-decaf-ethiopia','SRC-MVP-009',16000,'jubrancoffee'),('jubran-peru-swiss-water-decaf','SRC-MVP-010',21500,'jubrancoffee'),
  ('mhw-blade-r3','SRC-MVP-011',null,'kshta-coffee-tools'),('comandante-c40-nitro-blade','SRC-MVP-012',null,'kshta-coffee-tools'),('timemore-sculptor-064s','SRC-MVP-013',null,'kshta-coffee-tools'),('hario-v60-ceramic-02','SRC-MVP-014',39500,'kshta-coffee-tools'),('timemore-basic-2-scale','SRC-MVP-015',59500,'kshta-coffee-tools'),('hario-v60-paper-filters-100','SRC-MVP-016',null,'kshta-coffee-tools'),('arzum-okka-ok001','SRC-MVP-017',424000,'kshta-coffee-tools'),('fellow-aiden','SRC-MVP-018',null,'kshta-coffee-tools'),('flair-58-plus','SRC-MVP-019',1089000,'kshta-coffee-tools'),('urnex-cafiza-e31-100','SRC-MVP-020',null,'kshta-coffee-tools')
)
insert into public.offers (product_id,seller_organization_id,market_id,price,currency_code,availability,external_url,observed_at,source_record_id,status)
select p.id,o.id,m.id,s.price,'IQD','unknown',sr.url,'2026-08-17T00:00:00Z',sr.id,'published'
from seed s join public.products p on p.slug=s.product_slug join public.organizations o on o.slug=s.seller_slug join public.markets m on m.code='IQ-BGD' join public.source_records sr on sr.source_key=s.source_key
where not exists (select 1 from public.offers x where x.product_id=p.id and x.seller_organization_id=o.id and x.market_id=m.id and x.external_url=sr.url);

update public.products set status='published',published_at=coalesce(published_at,now()) where slug in ('df54-v4-coffee-grinder','1zpresso-j-ultra');
update public.offers o set status='published' from public.products p where p.id=o.product_id and p.slug in ('df54-v4-coffee-grinder','1zpresso-j-ultra');

with seed(product_slug,field_code,value_text,value_json,source_key) as (values
  ('jubran-ethiopia-bekele','brew_methods',null,'["filter"]'::jsonb,'SRC-MVP-001'),('jubran-ethiopia-bekele','roast_purpose','filter',null,'SRC-MVP-001'),('jubran-ethiopia-bekele','flavor_family',null,'["fruity"]'::jsonb,'SRC-MVP-001'),('jubran-ethiopia-bekele','coffee_form','whole',null,'SRC-MVP-001'),
  ('jubran-colombia-esperanza','brew_methods',null,'["filter"]'::jsonb,'SRC-MVP-002'),('jubran-colombia-esperanza','roast_purpose','filter',null,'SRC-MVP-002'),('jubran-colombia-esperanza','flavor_family',null,'["fruity","chocolate_cocoa"]'::jsonb,'SRC-MVP-002'),('jubran-colombia-esperanza','coffee_form','whole',null,'SRC-MVP-002'),
  ('jubran-colombia-meroe','brew_methods',null,'["filter"]'::jsonb,'SRC-MVP-003'),('jubran-colombia-meroe','roast_purpose','filter',null,'SRC-MVP-003'),('jubran-colombia-meroe','flavor_family',null,'["fruity","chocolate_cocoa"]'::jsonb,'SRC-MVP-003'),('jubran-colombia-meroe','coffee_form','whole',null,'SRC-MVP-003'),
  ('jubran-kenya-koji','brew_methods',null,'["filter"]'::jsonb,'SRC-MVP-004'),('jubran-kenya-koji','roast_purpose','filter',null,'SRC-MVP-004'),('jubran-kenya-koji','flavor_family',null,'["fruity"]'::jsonb,'SRC-MVP-004'),('jubran-kenya-koji','coffee_form','whole',null,'SRC-MVP-004'),
  ('jubran-el-salvador-tecapa','brew_methods',null,'["filter"]'::jsonb,'SRC-MVP-005'),('jubran-el-salvador-tecapa','roast_purpose','filter',null,'SRC-MVP-005'),('jubran-el-salvador-tecapa','flavor_family',null,'["sweet_caramel","nutty"]'::jsonb,'SRC-MVP-005'),('jubran-el-salvador-tecapa','coffee_form','whole',null,'SRC-MVP-005'),
  ('jubran-guatemala-mariano','brew_methods',null,'["filter"]'::jsonb,'SRC-MVP-006'),('jubran-guatemala-mariano','roast_purpose','filter',null,'SRC-MVP-006'),('jubran-guatemala-mariano','flavor_family',null,'["chocolate_cocoa","sweet_caramel"]'::jsonb,'SRC-MVP-006'),('jubran-guatemala-mariano','coffee_form','whole',null,'SRC-MVP-006'),
  ('jubran-phenomena-blend','brew_methods',null,'["espresso"]'::jsonb,'SRC-MVP-007'),('jubran-phenomena-blend','roast_purpose','espresso',null,'SRC-MVP-007'),('jubran-phenomena-blend','flavor_family',null,'["chocolate_cocoa","nutty"]'::jsonb,'SRC-MVP-007'),('jubran-phenomena-blend','coffee_form','whole',null,'SRC-MVP-007'),
  ('jubran-turkish-ethiopia','brew_methods',null,'["turkish"]'::jsonb,'SRC-MVP-008'),('jubran-turkish-ethiopia','roast_purpose','other_declared',null,'SRC-MVP-008'),('jubran-turkish-ethiopia','flavor_family',null,'["fruity"]'::jsonb,'SRC-MVP-008'),('jubran-turkish-ethiopia','coffee_form','ground',null,'SRC-MVP-008'),
  ('jubran-turkish-decaf-ethiopia','brew_methods',null,'["turkish"]'::jsonb,'SRC-MVP-009'),('jubran-turkish-decaf-ethiopia','roast_purpose','other_declared',null,'SRC-MVP-009'),('jubran-turkish-decaf-ethiopia','flavor_family',null,'["sweet_caramel","chocolate_cocoa"]'::jsonb,'SRC-MVP-009'),('jubran-turkish-decaf-ethiopia','coffee_form','ground',null,'SRC-MVP-009'),
  ('jubran-peru-swiss-water-decaf','brew_methods',null,'["filter","espresso"]'::jsonb,'SRC-MVP-010'),('jubran-peru-swiss-water-decaf','roast_purpose','omni',null,'SRC-MVP-010'),('jubran-peru-swiss-water-decaf','flavor_family',null,'["chocolate_cocoa","nutty"]'::jsonb,'SRC-MVP-010'),('jubran-peru-swiss-water-decaf','coffee_form','whole',null,'SRC-MVP-010'),
  ('mhw-blade-r3','grinder_drive','manual',null,'SRC-MVP-011'),('mhw-blade-r3','burr_geometry','conical',null,'SRC-MVP-011'),('comandante-c40-nitro-blade','grinder_drive','manual',null,'SRC-MVP-012'),('comandante-c40-nitro-blade','burr_geometry','conical',null,'SRC-MVP-012'),('timemore-sculptor-064s','grinder_drive','electric',null,'SRC-MVP-013'),('timemore-sculptor-064s','burr_geometry','flat',null,'SRC-MVP-013')
)
insert into public.product_attribute_values (product_id,field_definition_id,value_text,value_json,source_record_id,observed_at)
select p.id,f.id,s.value_text,s.value_json,sr.id,'2026-08-17T00:00:00Z' from seed s join public.products p on p.slug=s.product_slug join public.field_definitions f on f.code=s.field_code join public.source_records sr on sr.source_key=s.source_key
on conflict (product_id,field_definition_id) do update set value_text=excluded.value_text,value_json=excluded.value_json,source_record_id=excluded.source_record_id,observed_at=excluded.observed_at;

insert into public.countries (code,name_ar,name_en,status) values
  ('ET','إثيوبيا','Ethiopia','published'),('CO','كولومبيا','Colombia','published'),('KE','كينيا','Kenya','published'),('SV','السلفادور','El Salvador','published'),('GT','جواتيمالا','Guatemala','published'),('PE','بيرو','Peru','published')
on conflict (code) do update set name_ar=excluded.name_ar,name_en=excluded.name_en,status='published';

with seed(country_code,slug,name_ar,name_en,altitude_min_m,altitude_max_m) as (values
  ('ET','bekele-highlands','مرتفعات بيكيلي','Bekele Highlands',2200,2200),('CO','potosi','بوتوسي','Potosi',1900,1900),('CO','meroe','مروي','Meroe',1700,1700),('KE','koji','كوجي','Koji',null,null),('SV','tecapa','تيكابا','Tecapa',null,null),('GT','mariano','ماريانو','Mariano',null,null),('PE','swiss-water-decaf','سان إغناسيو، كاخاماركا','San Ignacio, Cajamarca',null,null)
)
insert into public.coffee_regions (country_code,slug,name_ar,name_en,altitude_min_m,altitude_max_m,status)
select country_code,slug,name_ar,name_en,altitude_min_m,altitude_max_m,'published' from seed
on conflict (country_code,slug) do update set name_ar=excluded.name_ar,name_en=excluded.name_en,altitude_min_m=excluded.altitude_min_m,altitude_max_m=excluded.altitude_max_m,status='published';

with seed(product_slug,country_code,region_slug,process_code,variety_codes,harvest_label,source_key,farm_name) as (values
  ('jubran-ethiopia-bekele','ET','bekele-highlands','anaerobic',array['heirloom'],'2025','SRC-MVP-001',null),('jubran-colombia-esperanza','CO','potosi','extended_natural',array['caturra','pink_bourbon'],'2025','SRC-MVP-002','Potosi'),('jubran-colombia-meroe','CO','meroe','washed_infusion',array['bourbon','caturra'],null,'SRC-MVP-003',null),('jubran-kenya-koji','KE','koji',null,array[]::text[],null,'SRC-MVP-004',null),('jubran-el-salvador-tecapa','SV','tecapa',null,array[]::text[],null,'SRC-MVP-005',null),('jubran-guatemala-mariano','GT','mariano',null,array[]::text[],null,'SRC-MVP-006',null),('jubran-peru-swiss-water-decaf','PE','swiss-water-decaf','swiss_water_decaf',array[]::text[],null,'SRC-MVP-010',null)
)
insert into public.origin_claims (product_id,country_code,coffee_region_id,farm_or_producer_name,process_code,variety_codes,harvest_label,source_record_id,verification_tier)
select p.id,s.country_code,r.id,s.farm_name,s.process_code,s.variety_codes,s.harvest_label,sr.id,'t2_source_checked' from seed s join public.products p on p.slug=s.product_slug join public.coffee_regions r on r.country_code=s.country_code and r.slug=s.region_slug join public.source_records sr on sr.source_key=s.source_key
where not exists (select 1 from public.origin_claims x where x.product_id=p.id and x.coffee_region_id=r.id);

with seed(slug,type,title_ar,title_en,excerpt_ar,body_ar) as (values
  ('choose-coffee-by-brew-method','guide','كيف تختار القهوة حسب طريقة التحضير؟','Choose coffee by brew method','ابدأ بطريقة التحضير ثم قارن الغرض من التحميص والنكهات وشكل القهوة.','ابدأ دائماً بطريقة التحضير المتاحة لديك. للفلتر ابحث عن منتج يذكر الفلتر بوضوح، وللإسبريسو ابدأ بالمحاصيل أو الخلطات المعلنة للإسبريسو.\n\nلا تعني درجة المطابقة أن خياراً واحداً صحيح للجميع؛ هي ترتيب مبني على البيانات المنشورة. إذا كانت خانة ما ناقصة، تعرض المنصة ذلك ولا تخمنها.\n\nالقهوة التركية حالة مباشرة في V1: اختر قهوة مطحونة ومعلنة للتحضير التركي.'),
  ('read-coffee-origin-card','guide','كيف تقرأ بطاقة منشأ القهوة؟','Read a coffee origin card','شرح مختصر للبلد والمنطقة والمعالجة والسلالة والحصاد.','البلد يعطي الإطار العام، والمنطقة تضيف سياقاً أدق للارتفاع والبيئة. اسم المزرعة أو المنتج يحدد صاحب الدفعة عندما يكون منشوراً في المصدر.\n\nالمعالجة تصف ما يحدث للثمرة بعد القطاف، بينما السلالة تصف المادة النباتية. سنة الحصاد تساعد على فهم حداثة الدفعة، لكنها لا تكفي وحدها للحكم على الجودة.\n\nكل ادعاء منشأ في المنصة مرتبط بمصدر، وتظهر البيانات الناقصة كبيانات ناقصة.'),
  ('grinder-buying-basics','guide','أساسيات اختيار مطحنة القهوة','Grinder buying basics','يدوية أم كهربائية، مسطحة أم مخروطية، وكيف تستخدم الفلاتر للمقارنة.','اختر نمط التشغيل أولاً: اليدوية مناسبة للتنقل والجرعات الصغيرة، والكهربائية أسرع للاستخدام المتكرر.\n\nشكل الشفرات وحده لا يحسم النتيجة، لكنه يساعد على مقارنة منتجات من الفئة نفسها. راقب نطاق الطحن وطريقة الضبط وسعة الجرعة وملاءمة المطحنة لطريقتك.\n\nقارن من منتجين إلى أربعة فقط داخل مجموعة مقارنة واحدة حتى تبقى الفروق واضحة.'),
  ('offer-verification-guide','article','كيف تتعامل المنصة مع السعر والتوفر؟','How offer verification works','العرض سجل منفصل عن المنتج وله بائع ورابط وتاريخ رصد.','هوية المنتج ومواصفاته الأساسية لا تتغير لمجرد تغير السعر. لذلك تحفظ المنصة العرض كسجل منفصل مرتبط ببائع وسوق ورابط خارجي وتاريخ رصد.\n\nالتوفر المجهول لا يعامل كمتوفر. وعندما لا يظهر سعر واضح في المصدر، ننشر المنتج مع عبارة السعر غير متوفر بدلاً من التخمين.\n\nالشراء يتم خارج المنصة من موقع البائع؛ لا توجد سلة أو عملية دفع أو طلب داخلي في V1.')
)
insert into public.contents (slug,type,title_ar,title_en,excerpt_ar,body_ar,author_profile_id,status,published_at)
select s.slug,s.type::public.content_type,s.title_ar,s.title_en,s.excerpt_ar,s.body_ar,a.id,'published',now() from seed s cross join lateral (select id from public.profiles where role='admin' and is_active order by created_at limit 1) a
on conflict (slug) do update set type=excluded.type,title_ar=excluded.title_ar,title_en=excluded.title_en,excerpt_ar=excluded.excerpt_ar,body_ar=excluded.body_ar,status='published',published_at=coalesce(public.contents.published_at,excluded.published_at);

with seed(slug,name_ar,name_en) as (values ('coffee-selection','اختيار القهوة','Coffee selection'),('origins','المناشئ','Origins'),('equipment','المعدات','Equipment'),('market-transparency','شفافية السوق','Market transparency'))
insert into public.topics (slug,name_ar,name_en,status) select slug,name_ar,name_en,'published' from seed
on conflict (slug) do update set name_ar=excluded.name_ar,name_en=excluded.name_en,status='published';

with seed(content_slug,topic_slug) as (values ('choose-coffee-by-brew-method','coffee-selection'),('read-coffee-origin-card','origins'),('grinder-buying-basics','equipment'),('offer-verification-guide','market-transparency'))
insert into public.content_topics (content_id,topic_id) select c.id,t.id from seed s join public.contents c on c.slug=s.content_slug join public.topics t on t.slug=s.topic_slug on conflict do nothing;

with mapped as (
  select p.id as product_id,sr.id as source_record_id from public.products p join public.source_records sr on sr.source_key='SRC-MVP-' || lpad((case p.slug
    when 'jubran-ethiopia-bekele' then 1 when 'jubran-colombia-esperanza' then 2 when 'jubran-colombia-meroe' then 3 when 'jubran-kenya-koji' then 4 when 'jubran-el-salvador-tecapa' then 5 when 'jubran-guatemala-mariano' then 6 when 'jubran-phenomena-blend' then 7 when 'jubran-turkish-ethiopia' then 8 when 'jubran-turkish-decaf-ethiopia' then 9 when 'jubran-peru-swiss-water-decaf' then 10 when 'mhw-blade-r3' then 11 when 'comandante-c40-nitro-blade' then 12 when 'timemore-sculptor-064s' then 13 when 'hario-v60-ceramic-02' then 14 when 'timemore-basic-2-scale' then 15 when 'hario-v60-paper-filters-100' then 16 when 'arzum-okka-ok001' then 17 when 'fellow-aiden' then 18 when 'flair-58-plus' then 19 when 'urnex-cafiza-e31-100' then 20 end)::text,3,'0')
  where p.slug in ('jubran-ethiopia-bekele','jubran-colombia-esperanza','jubran-colombia-meroe','jubran-kenya-koji','jubran-el-salvador-tecapa','jubran-guatemala-mariano','jubran-phenomena-blend','jubran-turkish-ethiopia','jubran-turkish-decaf-ethiopia','jubran-peru-swiss-water-decaf','mhw-blade-r3','comandante-c40-nitro-blade','timemore-sculptor-064s','hario-v60-ceramic-02','timemore-basic-2-scale','hario-v60-paper-filters-100','arzum-okka-ok001','fellow-aiden','flair-58-plus','urnex-cafiza-e31-100')
)
insert into public.entity_source_links (entity_table,entity_id,source_record_id,claim_scope,is_primary,created_by)
select 'products',m.product_id,m.source_record_id,array['identity','description','local_offer'],true,a.id from mapped m cross join lateral (select id from public.profiles where role='admin' and is_active order by created_at limit 1) a
on conflict (entity_table,entity_id,source_record_id) do update set claim_scope=excluded.claim_scope,is_primary=true;

insert into public.audit_events (actor_user_id,action,entity_table,entity_id,after_data,source)
select a.id,'publish_mvp_catalog_content_origins','products','MVP-CATALOG-20260817',jsonb_build_object('published_products',(select count(*) from public.products where status='published'),'published_offers',(select count(*) from public.offers where status='published'),'published_contents',(select count(*) from public.contents where status='published'),'published_origins',(select count(*) from public.origin_claims)),'migration_015'
from (select id from public.profiles where role='admin' and is_active order by created_at limit 1) a
where not exists (select 1 from public.audit_events where action='publish_mvp_catalog_content_origins' and entity_id='MVP-CATALOG-20260817');

commit;

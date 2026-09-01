-- Coffee Platform V1 — search governance, terminology and privacy-safe query analytics
-- Version: 1.0.0 | Date: 2026-08-09
-- Search remains deterministic; AI may suggest changes later but cannot activate terms by itself.

begin;

create table if not exists public.search_terms (
  id uuid primary key default gen_random_uuid(),
  market_code text not null default 'IQ-BGD' check (market_code ~ '^[A-Z0-9_-]{2,20}$'),
  canonical_term_ar text not null check (char_length(canonical_term_ar) between 2 and 120),
  canonical_term_en text check (canonical_term_en is null or char_length(canonical_term_en) between 2 and 120),
  normalized_term text not null check (char_length(normalized_term) between 2 and 120),
  aliases text[] not null default '{}'::text[] check (cardinality(aliases) <= 30),
  intent text not null check (intent in ('broad','product','organization','content','origin')),
  entity_scope text[] not null default array['product','origin','content','organization']::text[]
    check (cardinality(entity_scope) between 1 and 4 and entity_scope <@ array['product','origin','content','organization']::text[]),
  match_mode text not null default 'exact' check (match_mode in ('exact','prefix','contains')),
  weight smallint not null default 50 check (weight between 0 and 100),
  source_basis text not null check (source_basis in ('platform_decision','industry_reference','observed_query')),
  notes_ar text,
  status text not null default 'draft' check (status in ('draft','active','retired')),
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (market_code, normalized_term)
);

create table if not exists public.search_query_events (
  id bigint generated always as identity primary key,
  market_code text not null default 'IQ-BGD' check (market_code ~ '^[A-Z0-9_-]{2,20}$'),
  normalized_query text not null check (char_length(normalized_query) between 2 and 80),
  inferred_intent text not null check (inferred_intent in ('broad','product','organization','content','origin','unknown')),
  requested_type text not null check (requested_type in ('smart','all','product','organization','content','origin')),
  result_count integer not null check (result_count between 0 and 1000),
  result_counts jsonb not null default '{}'::jsonb check (jsonb_typeof(result_counts) = 'object'),
  is_review_mode boolean not null default false,
  created_at timestamptz not null default now()
);

drop trigger if exists set_search_terms_updated_at on public.search_terms;
create trigger set_search_terms_updated_at
before update on public.search_terms
for each row execute function private.set_updated_at();

create index if not exists search_terms_active_market_idx
  on public.search_terms (market_code, normalized_term, weight desc)
  where status = 'active';
create index if not exists search_terms_updated_by_fkey_idx on public.search_terms (updated_by);
create index if not exists search_query_events_recent_idx on public.search_query_events (created_at desc);
create index if not exists search_query_events_zero_results_idx
  on public.search_query_events (normalized_query, created_at desc)
  where result_count = 0;

alter table public.search_terms enable row level security;
alter table public.search_query_events enable row level security;

grant select on public.search_terms to anon, authenticated;
grant insert on public.search_query_events to anon, authenticated;
grant select, insert, update, delete on public.search_terms to authenticated;
grant select, delete on public.search_query_events to authenticated;

drop policy if exists search_terms_public_read on public.search_terms;
create policy search_terms_public_read on public.search_terms for select to anon
  using (status = 'active');
drop policy if exists search_terms_staff_all on public.search_terms;
create policy search_terms_staff_all on public.search_terms for all to authenticated
  using ((select private.is_staff())) with check ((select private.is_staff()));

drop policy if exists search_query_events_public_insert on public.search_query_events;
create policy search_query_events_public_insert on public.search_query_events for insert to anon, authenticated
  with check (
    market_code = 'IQ-BGD'
    and char_length(normalized_query) between 2 and 80
    and result_count between 0 and 1000
  );
drop policy if exists search_query_events_staff_read on public.search_query_events;
create policy search_query_events_staff_read on public.search_query_events for select to authenticated
  using ((select private.is_staff()));
drop policy if exists search_query_events_staff_delete on public.search_query_events;
create policy search_query_events_staff_delete on public.search_query_events for delete to authenticated
  using ((select private.is_staff()));

insert into public.search_terms
  (market_code, canonical_term_ar, canonical_term_en, normalized_term, aliases, intent, entity_scope, match_mode, weight, source_basis, notes_ar, status)
values
  ('IQ-BGD','قهوة','Coffee','قهوة',array['القهوة','بن','حبوب القهوة','coffee','coffee beans'],'broad',array['product','origin','content','organization'],'exact',100,'platform_decision','الكلمة العامة تعرض عائلات المنصة الأربع منفصلة.','active'),
  ('IQ-BGD','قهوة فلتر','Filter coffee','قهوة فلتر',array['قهوة تقطير','فلتر كوفي','filter coffee','pour over coffee'],'product',array['product','content'],'contains',90,'platform_decision','المنتجات أولاً ثم المعرفة المرتبطة.','active'),
  ('IQ-BGD','قهوة إسبريسو','Espresso coffee','قهوة اسبريسو',array['إسبريسو','اسبريسو','espresso','espresso coffee'],'product',array['product','content'],'contains',90,'platform_decision','توحيد اختلاف الهمزة والكتابة الإنجليزية.','active'),
  ('IQ-BGD','قهوة تركية','Turkish coffee','قهوة تركية',array['تركي','turkish coffee'],'product',array['product','content'],'contains',85,'platform_decision','القهوة التركية ضمن الطبقة الأولى في V1.','active'),
  ('IQ-BGD','مطحنة قهوة','Coffee grinder','مطحنة قهوة',array['مطحنة','طاحونة','grinder','coffee grinder'],'product',array['product','content'],'contains',95,'platform_decision','مطحنة منتج؛ المحتوى المرتبط يظهر بعدها.','active'),
  ('IQ-BGD','ماكينة تحميص','Coffee roasting machine','ماكينة تحميص',array['مكائن تحميص','ماكينات تحميص','roasting machine','coffee roaster machine'],'product',array['product','content','organization'],'contains',100,'platform_decision','تمييز صريح عن المحمصة بوصفها جهة.','active'),
  ('IQ-BGD','محمصة','Roastery','محمصة',array['محامص','roastery','coffee roastery'],'organization',array['organization','product','content'],'exact',100,'platform_decision','المحمصة جهة؛ لا تستخدم للدلالة على ماكينة التحميص.','active'),
  ('IQ-BGD','مقهى','Cafe','مقهى',array['مقاهي','كافيه','كافيهات','cafe','coffee shop'],'organization',array['organization'],'contains',90,'platform_decision','مصطلحات مفهومة في السوق العراقي.','active'),
  ('IQ-BGD','مورد معدات','Equipment supplier','مورد معدات',array['موردين معدات','مجهز معدات','equipment supplier'],'organization',array['organization','product'],'contains',90,'platform_decision','الجهة أولاً والمنتجات المرتبطة ثانياً.','active'),
  ('IQ-BGD','مصدر القهوة','Coffee origin','مصدر القهوة',array['منشأ القهوة','بلد المنشأ','coffee origin','origin'],'origin',array['origin','product','content'],'contains',95,'platform_decision','المصدر ككيان جغرافي ثم المنتجات والمحتوى.','active'),
  ('IQ-BGD','إثيوبيا','Ethiopia','اثيوبيا',array['إثيوبيا','ethiopia','ethiopian'],'origin',array['origin','product','content'],'contains',90,'industry_reference','اختلاف كتابة الهمزة والإنجليزية.','active'),
  ('IQ-BGD','قوجي','Guji','قوجي',array['غوجي','guji','guji zone'],'origin',array['origin','product','content'],'contains',95,'industry_reference','منطقة منشأ ثم القهوة والمحتوى المرتبط.','active'),
  ('IQ-BGD','دليل القهوة','Coffee guide','دليل القهوة',array['دليل','شرح','guide','how to'],'content',array['content','product'],'contains',70,'platform_decision','المعرفة أولاً عند وجود طلب تعليمي واضح.','active'),
  ('IQ-BGD','تنظيف معدات القهوة','Coffee equipment cleaning','تنظيف معدات القهوة',array['تنظيف مطحنة','تنظيف ماكينة','مواد تنظيف','coffee cleaning'],'content',array['content','product'],'contains',85,'platform_decision','المعرفة أولاً ثم منتجات العناية والصيانة.','active')
on conflict (market_code, normalized_term) do update set
  canonical_term_ar = excluded.canonical_term_ar,
  canonical_term_en = excluded.canonical_term_en,
  aliases = excluded.aliases,
  intent = excluded.intent,
  entity_scope = excluded.entity_scope,
  match_mode = excluded.match_mode,
  weight = excluded.weight,
  source_basis = excluded.source_basis,
  notes_ar = excluded.notes_ar,
  status = excluded.status;

comment on table public.search_terms is 'Human-governed Arabic/English search dictionary. AI suggestions remain draft until staff approval.';
comment on table public.search_query_events is 'Privacy-minimized search quality events without user, IP, device, or session identifiers.';

commit;

select
  (select count(*) from public.search_terms where status = 'active') as active_search_terms,
  to_regclass('public.search_query_events') as search_query_events_table;

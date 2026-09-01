-- Coffee Platform V1 — corrections from the first closed-beta search reports
-- Date: 2026-08-17

begin;

update public.search_terms
set
  entity_scope = array['product', 'origin', 'content']::text[],
  notes_ar = 'البحث العام عن القهوة يستبعد الجهات؛ كلمة مقهى أو محمصة تستخدم لاكتشاف الجهات صراحة.'
where market_code = 'IQ-BGD'
  and normalized_term = 'قهوة'
  and status = 'active';

commit;

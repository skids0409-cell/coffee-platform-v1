-- Coffee Platform V1 — avoid overlapping permissive SELECT policies on search_terms
-- Version: 1.0.0 | Date: 2026-08-09
begin;
drop policy if exists search_terms_public_read on public.search_terms;
create policy search_terms_public_read on public.search_terms for select to anon
  using (status = 'active');
commit;

begin;

-- Offers remain sourced and reviewed, but the public customer journey stays
-- inside Qahwatna. External URLs are evidence for staff, not the primary CTA.
insert into public.platform_settings(key,value,description_ar,description_en,is_public)
values(
  'commerce_mode',
  '"internal_seller_pages"'::jsonb,
  'العروض والمنتجات تقود إلى صفحة البائع داخل المنصة؛ الروابط الخارجية للتوثيق الإداري فقط',
  'Offers and products lead to internal seller pages; external links are administrative evidence only',
  true
)
on conflict (key) do update set
  value=excluded.value,
  description_ar=excluded.description_ar,
  description_en=excluded.description_en,
  is_public=excluded.is_public;

commit;

# تدقيق واسترجاع مخطط Supabase — 1 سبتمبر 2026

## النتيجة التنفيذية

كان مستودع GitHub المستورد ناقصاً بالفعل. لم تكن الفجوة محصورة في `035–038`؛ كان `031` مفقوداً أيضاً، وكانت Phase 4 ممثلة بترقيتين منفصلتين بعد `038`.

استُخرجت النصوص الأصلية من `supabase_migrations.schema_migrations` في مشروع `coffee-platform-v1`، وحُفظت دون إعادة توليد أو تخمين. يثبت `supabase/RECOVERY_MANIFEST.json` الإصدار والاسم والملف وMD5 بعد حذف المسافات لكل ترقية مسترجعة.

## الملفات المسترجعة

| الملف | إصدار Supabase | الاسم المسجل |
|---|---:|---|
| `031a_step1_database_hardening.sql` | `20260825120426` | `step1_database_hardening` |
| `031b_step1_taxonomy_filter_repair.sql` | `20260825120614` | `step1_taxonomy_filter_repair` |
| `035_non_destructive_taxonomy_reconciliation.sql` | `20260826152712` | `non_destructive_taxonomy_reconciliation` |
| `036_phase2_record_capability_contract.sql` | `20260830141955` | `phase2_record_capability_contract` |
| `037_phase3_media_vault_ingestion.sql` | `20260830194621` | `phase3_media_vault_ingestion` |
| `037b_phase3_media_vault_fk_indexes.sql` | `20260830194711` | `phase3_media_vault_fk_indexes` |
| `038_phase3_legacy_entity_media_backfill.sql` | `20260830203807` | `phase3_legacy_entity_media_backfill` |
| `039_phase4_independent_media_vault.sql` | `20260901115355` | `phase4_independent_media_vault` |
| `040_phase4_media_vault_fk_indexes.sql` | `20260901115424` | `phase4_media_vault_fk_indexes` |

## أدلة المطابقة من القاعدة الحية

- PostgreSQL `17.6` وحالة المشروع `ACTIVE_HEALTHY`.
- سجل Supabase يحتوي 34 ترقية مسجلة، منها سبع ترقيات بعد `034`.
- `031a/031b` موجودتان فعلياً: دالة التطبيع، عمود السعر المرجعي، الفهرس، وإصلاح فلاتر التصنيف.
- Postflight التصنيف: 59 فئة، 50 فئة معدات قابلة للاختيار، ولا فئات مخفية أو روابط family/filter ناقصة.
- STEP2: خمس RPCs محكومة، سبع سياسات إدارة، وصفر صلاحيات `TRUNCATE/TRIGGER/REFERENCES` لـ`anon/authenticated`.
- Phase 2: RPCs الإنشاء والتعديل والعقد موجودة كـ`SECURITY INVOKER`، متاحة لـ`authenticated` وغير متاحة لـ`anon`.
- Phase 3/4: تسعة جداول Media Vault المطلوبة موجودة وكلها مفعّل عليها RLS.
- Backfill: 9 أصول و9 روابط، وصفر orphan links أو primary collisions.
- جميع القيود في `public` validated، ولا يوجد جدول تطبيق في `public` دون RLS.
- حاويات `media-quarantine` و`media-derivatives` خاصة، وسياسات التخزين الخمس المطلوبة موجودة.
- فحص الأمان لا يعرض مشكلة schema؛ التحذير الوحيد هو تعطيل Leaked Password Protection، وهو إعداد Auth خارج migrations.

## ملاحظة تاريخية

بعض ترقيات التأسيس `001–007` نُفذت قبل بدء تسجيل CLI الحالي، لذلك لا تظهر كسجلات في `supabase_migrations` رغم وجود كائناتها. كما أن `019_brand_governance.sql` في المستودع يطابق نسخة الإصلاح اللاحقة `brand_governance_admin_fix` وليس النسخة الأولى المعيبة.

## حدود ادعاء المطابقة

المطابقة الهيكلية للكائنات المسترجعة من Phase 1 إلى Phase 4 مؤكدة، ونصوص الترقيات التسع المسترجعة مطابقة حرفياً لسجل Supabase وفق hashes المثبتة. لم يُنفّذ replay كامل من قاعدة فارغة لأن المشروع لا يوفّر بيئة PostgreSQL محلية جاهزة، وإنشاء مشروع أو فرع Supabase إضافي قد يترتب عليه استهلاك أو كلفة ويحتاج موافقة مستقلة.

كشف التدقيق كذلك اختلافين تاريخيين سابقين لـPhase 2، ولم يُغيّرا ضمن عملية الاسترجاع هذه حتى لا نبدّل سلوك الإنتاج بلا قرار وظيفي:

- تعريف دالة قديمة في `017_admin_workflow.sql`: النسخة الحية تعيد `attached` لمسار origin، بينما الملف المستورد يعيد `draft`.
- صف seed للجهة `kshta`: توجد فروقات في `published_at` و`source_checked_at` بين الملف التاريخي والقيم الحية.

هذان الاختلافان لا يمثلان جدولاً أو سياسة أو قيداً مفقوداً، ولا يمنعان استرجاع Phase 2–4. لكن لا يصح وصف تاريخ المستودع كله بأنه replay مطابق 100% قبل حسم السلوك المطلوب للدالة وقيم seed ثم اختبار replay في قاعدة معزولة.

## بوابة الحماية

يشغّل الأمر `npm run verify:migrations` فحص hashes للنصوص المسترجعة. أي تعديل غير مقصود يفشل قبل البناء والاختبارات.

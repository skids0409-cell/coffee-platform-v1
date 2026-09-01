# بيانات V1

يحتوي هذا المجلد على دفعات البيانات المنظمة التي يمكن تتبعها إلى ملفات SQL ومصادرها.

## `baghdad_organization_batch_001.json`

- `batch_code`: رمز الدفعة.
- `market_code`: سوق الإطلاق.
- `accessed_at`: تاريخ الاطلاع على المصادر.
- `organizations`: الصفوف بالترتيب:
  `organization_code`, `slug`, `name_ar`, `name_en`, `roles`, `website_url`,
  `phone`, `email`, `verification_tier`, `status`, `intake_decision`,
  `source_key`, `source_checked_at`, `evidence_note`.
- `locations`: الصفوف بالترتيب:
  `source_key`, `organization_code`, `name_ar`, `name_en`, `address_ar`,
  `address_en`, `phone`, `source_record_key`, `status`.
- `sources`: سجلات المصادر الرسمية أو المباشرة المستخدمة في التحقق.
- `issues`: مشكلات جودة البيانات وقرارات المعالجة.

النسخة الموجودة هنا تشمل تصحيح 007: رقم Italian Coffee الحالي، أرشفة موقع بغداد غير المثبت، واستبعاد بيانات قالب Kshta الأجنبية.

## `baghdad_product_batch_001.json`

- الدفعة الأولى لمنتجات المعدات والعروض المحلية.
- تشمل مطحنة كهربائية، مطحنة يدوية، وماكينة تحميص تجارية.
- تفصل مواصفات المصنّع عن سعر البائع وتسجل التعارضات بدلاً من دمجها.
- تستبعد البن الأخضر وتبقي جميع المنتجات والعروض بحالة `in_review`.

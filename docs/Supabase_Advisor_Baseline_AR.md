# خط أساس مستشار Supabase

**تاريخ الفحص:** 9 أغسطس 2026

## المعالج

- نقل `pg_trgm` من `public` إلى `extensions`.
- إضافة فهارس لـ46 مفتاحاً خارجياً؛ نتيجة إعادة الفحص: صفر مفاتيح خارجية غير مفهرسة.
- لم تتغير حالة النشر: الإطلاق العام `false` وعدد الجهات المنشورة صفر.

## المفتوح

- `P1`: تفعيل Leaked Password Protection قبل إطلاق تسجيل الدخول العام.
- `P2`: دمج سياسات RLS المتداخلة بعد تثبيت نموذج الحسابات والأدوار.

## المصادر

- https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public
- https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys
- https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

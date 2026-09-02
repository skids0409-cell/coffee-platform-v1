# تشغيل CI/CD والنسخة التجريبية في بغداد

## القرار التشغيلي

- مستودع GitHub `skids0409-cell/coffee-platform-v1` هو مصدر الكود المعتمد.
- أي دفع إلى `phase5/**` أو Pull Request إلى `main` يمر عبر بوابة الجودة ولا ينشر تلقائياً.
- أي دفع مراجع إلى `main` ينشر تلقائياً إلى Worker باسم `coffee-platform-baghdad-beta` بعد نجاح البوابة.
- يمكن تشغيل نشر يدوي من فرع Phase 5 من صفحة Actions مع اختيار `deploy_beta=true`، من دون دمجه إلى `main`.

## ما تفحصه بوابة الجودة

1. تثبيت الحزم المقفلة في `package-lock.json`.
2. تشغيل Lint.
3. التحقق من تسلسل Supabase Migrations.
4. تشغيل مجموعة الاختبارات كاملة وبناء Vinext.
5. التحقق من Worker ESM ومن ملفات الاستضافة.
6. تنفيذ Cloudflare deployment dry-run بوضع `--strict`.
7. رفض أي تغيير غير مقصود يولده البناء داخل ملفات Git المتتبعة.
8. حفظ `dist/` كـ artifact غير قابل للاستبدال لمدة سبعة أيام، ثم نشر artifact نفسه الذي اجتاز الفحوصات.

## الأسرار المطلوبة

من GitHub افتح:

`Settings → Environments → New environment → baghdad-beta`

ثم أضف Environment secrets التالية:

| الاسم | المصدر | الغرض |
|---|---|---|
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Dashboard | تحديد حساب النشر |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API Tokens | نشر وتحديث Worker فقط |
| `SUPABASE_URL` | Supabase Project Settings | عنوان Data API |
| `SUPABASE_PUBLISHABLE_KEY` | Supabase Project Settings | مفتاح العميل العام المعتمد |

يجب أن يكون Cloudflare token محدوداً بالحساب المطلوب وبصلاحية تحرير Workers. لا تضف `service_role` أو أي مفتاح Supabase سري إلى هذا المسار؛ التطبيق يعتمد جلسة المستخدم وسياسات RLS.

## التفعيل لأول مرة

1. أضف الأسرار الأربعة إلى Environment باسم `baghdad-beta`.
2. افتح `Actions → Coffee Platform CI/CD → Run workflow`.
3. اختر فرع `phase5/record-management` للاختبار الحالي، وفعّل `deploy_beta`.
4. بعد نجاح اختبار بغداد، افتح Pull Request من Phase 5 إلى `main`.
5. فعّل حماية `main` واشترط نجاح check باسم `Quality gate` قبل الدمج.

بعد أول نشر ناجح سيظهر رابط `workers.dev` في صفحة Environment وملخص عملية GitHub Actions. بعد اعتماد نطاق رسمي يمكن ربطه بالـ Worker من Cloudflare من دون تغيير مصدر الكود أو مسار الاختبارات.

# تشغيل النسخة التجريبية على Render

## البنية المعتمدة

- التطبيق: Next.js يعمل كخدمة Node.js قياسية على Render.
- قاعدة البيانات والمصادقة والتخزين: Supabase الحالي.
- المصدر البرمجي: مستودع GitHub والفرع `main` للإنتاج التجريبي.
- بوابة الجودة: GitHub Actions على `main` و`phase5/**` وطلبات الدمج إلى `main`.
- النشر الآلي: يبدأ Render فقط بعد نجاح فحوص GitHub (`checksPass`).

## تفعيل Blueprint لأول مرة

1. من Render اختر **New > Blueprint**.
2. اربط المستودع `skids0409-cell/coffee-platform-v1`.
3. اختر ملف `render.yaml` من الفرع `main`.
4. عند مطالبة Render بالقيم، أدخل:
   - `SUPABASE_URL`
   - `SUPABASE_PUBLISHABLE_KEY`
5. في Supabase Auth > URL Configuration اضبط Site URL على `https://coffee-platform-baghdad-beta.onrender.com`، وأضف `https://coffee-platform-baghdad-beta.onrender.com/auth/callback` إلى Redirect URLs.
6. في Supabase Auth > Email Templates > Reset password، يفضّل أن يكون رابط الزر المباشر:
   `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery`
   ويظل مسار التطبيق متوافقاً أيضاً مع قالب `{{ .ConfirmationURL }}` الافتراضي ومع PKCE.
7. لا تضف مفتاح `service_role` إلى خدمة الويب.
8. نفّذ أول Deploy وتأكد أن `/api/health` يعيد الحالة `ok`، ثم اطلب رابطاً جديداً من `/forgot-password` وافتح أحدث رسالة مرة واحدة.

القيمتان السريتان معلّمتان بـ `sync: false`، لذلك لا تُخزنان في Git ولا تظهر قيمهما في ملف Blueprint.

## سياسة الفروع والنشر

- الدفع إلى `phase5/**`: يبني التطبيق ويشغّل Lint والاختبارات، ولا ينشر خدمة الإنتاج.
- طلب الدمج إلى `main`: يشغّل بوابة الجودة قبل الدمج.
- الدفع أو الدمج إلى `main`: ينتظر Render نجاح GitHub Actions ثم ينشر تلقائياً.

## إعداد الخدمة

- المنطقة: Frankfurt، وهي أقرب منطقة Render متاحة للجمهور المستهدف في بغداد.
- البناء: `npm ci --include=dev && npm run build` لضمان توفر أدوات Tailwind وPostCSS أثناء البناء حتى مع `NODE_ENV=production`.
- التشغيل: `npm start`، ويستمع Next.js على `0.0.0.0` والمنفذ الذي يمرره Render.
- فحص الصحة: `/api/health`.
- إصدار Node.js: `24.19.0` من `.node-version` و`NODE_VERSION`.

## التراجع الآمن

إذا فشل إصدار لاحق، استخدم **Rollback** في Render إلى آخر Deploy ناجح، ثم أصلح الفرع عبر Commit جديد. لا تُجرِ تعديلات مباشرة على ملفات البناء ولا تضع أسراراً داخل المستودع.

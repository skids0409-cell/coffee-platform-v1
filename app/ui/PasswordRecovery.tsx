"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function ForgotPassword() {
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/password-reset", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: form.get("email") }),
    });
    setSubmitting(false);
    if (response.status === 429) {
      setMessage("تم إرسال طلبات كثيرة. انتظر قليلاً ثم حاول مجدداً.");
      return;
    }
    if (!response.ok) {
      setMessage("تعذر إرسال رسالة الاسترداد الآن. حاول مرة أخرى لاحقاً.");
      return;
    }
    setMessage("إذا كان البريد مرتبطاً بحساب الإدارة فستصلك رسالة. استخدم أحدث رابط فقط، ومن الجهاز والمتصفح نفسيهما.");
  }

  return <main className="password-recovery-page"><section className="password-recovery-card"><span className="eyebrow">حساب الإدارة</span><h1>استعادة كلمة المرور</h1><p>أدخل بريد مدير المنصة. سنرسل رابطاً آمناً يفتح صفحة تعيين كلمة المرور على نطاق Render.</p><form onSubmit={submit}><label>البريد الإلكتروني<input name="email" type="email" autoComplete="email" required /></label><button className="primary" type="submit" disabled={submitting}>{submitting ? "جارٍ الإرسال…" : "إرسال رابط الاسترداد"}</button></form>{message && <p role="status" className="admin-message">{message}</p>}<Link href="/operations">العودة إلى دخول الإدارة</Link></section></main>;
}

export function UpdatePassword() {
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(true);
  const [updated, setUpdated] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("error")) {
      setReady(false);
      setMessage("رابط الاسترداد غير صالح أو منتهي. اطلب رابطاً جديداً واستخدم أحدث رسالة مرة واحدة فقط.");
    }
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/update-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: form.get("password"), confirmation: form.get("confirmation") }),
    });
    const result = await response.json().catch(() => ({}));
    setSubmitting(false);
    if (!response.ok) {
      setMessage(result.reason === "invalid_password" ? "استخدم 12 حرفاً على الأقل، وتأكد من تطابق الحقلين." : result.reason === "weak_password" ? "اختر كلمة مرور أقوى لم تُستخدم أو تتسرب سابقاً." : "انتهت جلسة الاسترداد. اطلب رابطاً جديداً.");
      return;
    }
    setUpdated(true);
    setMessage("تم تغيير كلمة المرور وإغلاق الجلسات السابقة. يمكنك الآن تسجيل الدخول بالكلمة الجديدة.");
  }

  return <main className="password-recovery-page"><section className="password-recovery-card"><span className="eyebrow">رابط استرداد موثّق</span><h1>تعيين كلمة مرور جديدة</h1>{!updated && ready && <><p>استخدم كلمة مرور قوية لا تقل عن 12 حرفاً. بعد الحفظ ستحتاج إلى تسجيل الدخول من جديد.</p><form onSubmit={submit}><label>كلمة المرور الجديدة<input name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required /></label><label>تأكيد كلمة المرور<input name="confirmation" type="password" autoComplete="new-password" minLength={12} maxLength={128} required /></label><button className="primary" type="submit" disabled={submitting}>{submitting ? "جارٍ الحفظ…" : "حفظ كلمة المرور"}</button></form></>}{message && <p role="status" className="admin-message">{message}</p>}<Link href={updated ? "/operations" : "/forgot-password"}>{updated ? "تسجيل الدخول إلى الإدارة" : "طلب رابط جديد"}</Link></section></main>;
}

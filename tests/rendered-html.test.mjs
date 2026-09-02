import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  expandArabicStorageVariants,
  normalizeSearchText,
} from "../lib/search-governance.ts";
import { validateOrganizationCsv } from "../lib/data-center.ts";
import { readAdminRestResponse } from "../lib/supabase-admin.ts";
import {
  ProductAttributeError,
  serializeProductAttributes,
} from "../lib/admin-product-contract.ts";
import {
  TaxonomyInputError,
  categoryPayload,
  fieldPayload,
  filterPayload,
} from "../lib/taxonomy-admin.ts";

const developmentPreviewMeta =
  /<meta(?=[^>]*\bname=["']codex-preview["'])(?=[^>]*\bcontent=["']development["'])[^>]*>/i;

async function loadWorker(label) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${label}-${process.pid}-${Date.now()}`);
  return (await import(workerUrl.href)).default;
}

const runtimeEnv = {
  ASSETS: {
    fetch: async () => new Response("Not found", { status: 404 }),
  },
};

const runtimeContext = {
  waitUntil() {},
  passThroughOnException() {},
};

test("renders development preview metadata", async () => {
  const worker = await loadWorker("home");

  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    runtimeEnv,
    runtimeContext,
  );

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("x-robots-tag"), "noindex, nofollow, noarchive");
  const html = await response.text();
  assert.match(html, developmentPreviewMeta);
  assert.match(html, /name="robots" content="noindex, nofollow, nocache"/);
});

test("smoke tests every declared product route", async () => {
  const source = readFileSync(
    new URL("../app/ui/Platform.tsx", import.meta.url),
    "utf8",
  );
  const paths = Array.from(source.matchAll(/\bpath:\s*"([^"]+)"/g), (match) => match[1]);
  assert.ok(paths.length >= 60, `expected at least 60 declared routes, found ${paths.length}`);
  assert.equal(new Set(paths).size, paths.length, "declared routes must be unique");
  const worker = await loadWorker("route-inventory");
  for (const path of paths) {
    const response = await worker.fetch(
      new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }),
      runtimeEnv,
      runtimeContext,
    );
    const html = await response.text();
    assert.equal(response.status, 200, `${path} should render`);
    assert.doesNotMatch(html, /الصفحة غير موجودة/, `${path} should not render 404 copy`);
  }
});

test("renders private operations and rights intake routes", async () => {
  const worker = await loadWorker("operations");
  const operations = await worker.fetch(
    new Request("http://localhost/operations", {
      headers: { accept: "text/html" },
    }),
    runtimeEnv,
    runtimeContext,
  );
  assert.equal(operations.status, 200);
  assert.match(await operations.text(), /حاجز النشر مفعّل/);

  const rights = await worker.fetch(
    new Request("http://localhost/rights/correction", {
      headers: { accept: "text/html" },
    }),
    runtimeEnv,
    runtimeContext,
  );
  assert.equal(rights.status, 200);
  assert.match(await rights.text(), /إرسال للمراجعة/);

  const feedback = await worker.fetch(
    new Request("http://localhost/beta/feedback", { headers: { accept: "text/html" } }),
    runtimeEnv,
    runtimeContext,
  );
  assert.equal(feedback.status, 200);
  assert.match(await feedback.text(), /نتيجة مهمة واحدة/);
});

test("beta feedback endpoint fails closed without Supabase", async () => {
  const worker = await loadWorker("beta-feedback");
  const response = await worker.fetch(new Request("http://localhost/api/beta-feedback", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://localhost" },
    body: JSON.stringify({ pagePath: "/coffee", taskCode: "discover", outcome: "success", deviceType: "android", severity: "none", feedbackText: "اكتملت المهمة بنجاح", consent: true }),
  }), runtimeEnv, runtimeContext);
  assert.equal(response.status, 503);
});

test("renders a closed-beta task hub with device-local progress", async () => {
  const worker = await loadWorker("beta-hub");
  const response = await worker.fetch(
    new Request("http://localhost/beta", {
      headers: { accept: "text/html" },
    }),
    runtimeEnv,
    runtimeContext,
  );
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.match(html, /اختبار واقعي من ست مهمات/);
  assert.match(html, /اكتشف جهة في بغداد/);
  assert.match(html, /اختبر البحث العام/);
  assert.match(html, /اختبر طلب المساعدة/);

  const source = readFileSync(
    new URL("../app/ui/Platform.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /coffee-platform-v1-beta-progress/);
});

test("renders help intake and a consent-based WhatsApp handoff", async () => {
  const worker = await loadWorker("help-support");
  const page = await worker.fetch(
    new Request("http://localhost/help", { headers: { accept: "text/html" } }),
    runtimeEnv,
    runtimeContext,
  );
  const html = await page.text();
  assert.equal(page.status, 200);
  assert.match(html, /المساعدة والتواصل/);
  assert.match(html, /تسجيل الطلب والحصول على رقم مرجعي/);
  assert.match(html, /wa\.me\/905417730348/);

  const api = await worker.fetch(new Request("http://localhost/api/support-request", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://localhost" },
    body: JSON.stringify({ requestType: "platform_issue", pagePath: "/search", subject: "مشكلة في البحث", message: "لم تظهر النتائج المطلوبة في صفحة البحث", preferredChannel: "whatsapp", consent: true }),
  }), runtimeEnv, runtimeContext);
  assert.equal(api.status, 503);
});

test("support requests are protected by explicit grants and staff-only RLS", () => {
  const migration = readFileSync(new URL("../supabase/migrations/013_support_requests_whatsapp.sql", import.meta.url), "utf8");
  assert.match(migration, /grant insert on public\.support_requests to anon, authenticated/);
  assert.match(migration, /alter table public\.support_requests enable row level security/);
  assert.match(migration, /support_requests_staff_read/);
  assert.match(migration, /select private\.is_staff/);
});

test("renders privacy, terms, and the governed operations shell", async () => {
  const worker = await loadWorker("policies");
  const privacy = await worker.fetch(
    new Request("http://localhost/privacy", { headers: { accept: "text/html" } }),
    runtimeEnv,
    runtimeContext,
  );
  const privacyHtml = await privacy.text();
  assert.equal(privacy.status, 200);
  assert.match(privacyHtml, /المفضلة والمقارنة وإجابات Coffee Finder/);
  assert.match(privacyHtml, /لا نبيع البيانات الشخصية/);

  const terms = await worker.fetch(
    new Request("http://localhost/terms", { headers: { accept: "text/html" } }),
    runtimeEnv,
    runtimeContext,
  );
  const termsHtml = await terms.text();
  assert.equal(terms.status, 200);
  assert.match(termsHtml, /لا تدير سلة أو دفعاً أو طلباً/);

  const operations = await worker.fetch(
    new Request("http://localhost/operations", { headers: { accept: "text/html" } }),
    runtimeEnv,
    runtimeContext,
  );
  const operationsHtml = await operations.text();
  assert.match(operationsHtml, /طابور المراجعة والاعتماد/);
  assert.doesNotMatch(operationsHtml, /مركز تشغيل بيانات قهوتنا/);
});

test("launch catalog migration seeds a sourced Finder-ready minimum", () => {
  const migration = readFileSync(
    new URL("../supabase/migrations/015_mvp_catalog_content_origins.sql", import.meta.url),
    "utf8",
  );
  assert.match(migration, /publish_mvp_catalog_content_origins/);
  assert.match(migration, /'coffee_form','ground'/);
  assert.match(migration, /'brew_methods',null,'\["turkish"\]'/);
  assert.match(migration, /insert into public\.origin_claims/);
  assert.match(migration, /insert into public\.contents/);
});

test("admin review endpoints deny unauthenticated access and render login shell", async () => {
  const worker = await loadWorker("admin-review");
  const api = await worker.fetch(
    new Request("http://localhost/api/admin/review"),
    runtimeEnv,
    runtimeContext,
  );
  assert.equal(api.status, 401);
  assert.deepEqual(await api.json(), { authenticated: false });

  const operations = await worker.fetch(
    new Request("http://localhost/operations", { headers: { accept: "text/html" } }),
    runtimeEnv,
    runtimeContext,
  );
  const html = await operations.text();
  assert.equal(operations.status, 200);
  assert.match(html, /طابور المراجعة والاعتماد/);
  assert.match(html, /جارٍ فحص جلسة الإدارة/);
});

test("partner portal renders and partner APIs fail closed without a session", async () => {
  const worker = await loadWorker("partner-portal");
  const page = await worker.fetch(new Request("http://localhost/partner", { headers: { accept: "text/html" } }), runtimeEnv, runtimeContext);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /جارٍ فحص حساب الجهة/);
  const submissions = await worker.fetch(new Request("http://localhost/api/partner/submissions"), runtimeEnv, runtimeContext);
  assert.equal(submissions.status, 401);
  assert.deepEqual(await submissions.json(), { authenticated: false });
  const adminQueue = await worker.fetch(new Request("http://localhost/api/admin/partner-submissions"), runtimeEnv, runtimeContext);
  assert.equal(adminQueue.status, 401);
});

test("partner schema enforces membership, workflow, and idempotency", () => {
  const schema = readFileSync(new URL("../supabase/migrations/028_partner_portal_beta.sql", import.meta.url), "utf8");
  const hardening = readFileSync(new URL("../supabase/migrations/029_partner_portal_hardening.sql", import.meta.url), "utf8");
  assert.match(schema, /unique\(submitted_by,idempotency_key\)/);
  assert.match(schema, /status in \('draft','submitted'\)/);
  assert.match(schema, /organization_memberships/);
  assert.match(hardening, /immutable_submission_identity/);
  assert.match(hardening, /status='active'/);
});

test("organization CSV intake validates Airtable headers, warnings, and duplicates", () => {
  const csv = '\uFEFFاسم الكافيه,عنوان,تواصل\n"جبران","اليرموك، أربع شوارع","@jubrancoffee"\n"كليدور","شارع الجامعة",""\n"جبران","اليرموك، أربع شوارع","@jubrancoffee"';
  const result = validateOrganizationCsv(csv);
  assert.equal(result.rows.length, 3);
  assert.equal(result.rows[0].status, "valid");
  assert.equal(result.rows[0].normalized.role_type, "cafe");
  assert.equal(result.rows[0].normalized.website_url, "https://www.instagram.com/jubrancoffee/");
  assert.equal(result.rows[1].status, "warning");
  assert.match(result.rows[1].messages.join(" "), /وسيلة تواصل/);
  assert.equal(result.rows[2].status, "invalid");
  assert.match(result.rows[2].messages.join(" "), /مكرر/);
  const participants = validateOrganizationCsv('اسم الجهة,نوع الجهة,عنوان,تواصل\n"محمصة اختبار","محمصة","الكرادة","@testroaster"\n"أكاديمية اختبار","مركز تدريب","المنصور","@testacademy"');
  assert.equal(participants.rows[0].normalized.role_type, "roaster");
  assert.equal(participants.rows[1].normalized.role_type, "service_provider");
});

test("operations renders the protected data center workflow", async () => {
  const worker = await loadWorker("data-center-shell");
  const response = await worker.fetch(
    new Request("http://localhost/operations", { headers: { accept: "text/html" } }),
    runtimeEnv,
    runtimeContext,
  );
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.match(html, /طابور المراجعة والاعتماد/);
  const source = readFileSync(new URL("../app/ui/Platform.tsx", import.meta.url), "utf8");
  assert.match(source, /إضافة سجل جديد/);
  assert.match(source, /تحويل إلى مسودات/);
  assert.match(source, /إرسال للمراجعة/);
});

test("data center import is staff-only and atomic", () => {
  const migration = readFileSync(new URL("../supabase/migrations/016_operations_data_center.sql", import.meta.url), "utf8");
  const permissions = readFileSync(new URL("../supabase/migrations/025_operations_staff_permissions.sql", import.meta.url), "utf8");
  assert.match(migration, /security definer/);
  assert.match(permissions, /private\.is_staff\(\)/);
  assert.match(migration, /'draft'/);
  assert.match(migration, /revoke all on function public\.import_organization_intake_batch/);
});

test("participant intake preserves the selected organization role", () => {
  const migration = readFileSync(new URL("../supabase/migrations/026_participant_organization_roles.sql", import.meta.url), "utf8");
  assert.match(migration, /normalized_payload->>'role_type'/);
  assert.match(migration, /public\.organization_role_type/);
  assert.match(migration, /import_participant_organization_batch_drafts/);
});

test("data center API rejects unauthenticated reads and writes", async () => {
  const worker = await loadWorker("data-center-auth");
  const read = await worker.fetch(new Request("http://localhost/api/admin/data-center"), runtimeEnv, runtimeContext);
  assert.equal(read.status, 401);
  const write = await worker.fetch(new Request("http://localhost/api/admin/data-center", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://localhost" },
    body: JSON.stringify({ action: "stage_csv", csvText: "اسم الكافيه,عنوان\nاختبار,بغداد" }),
  }), runtimeEnv, runtimeContext);
  assert.equal(write.status, 401);
});

test("admin REST accepts successful empty 201 responses", async () => {
  assert.equal(await readAdminRestResponse(new Response(null, { status: 201 })), undefined);
  assert.deepEqual(await readAdminRestResponse(new Response('[{"ok":true}]', { status: 201 })), [{ ok: true }]);
});

test("data center identifies Baghdad as the only current test market", () => {
  const source = readFileSync(new URL("../app/ui/Platform.tsx", import.meta.url), "utf8");
  assert.match(source, /النطاق الجغرافي للدليل في الاختبار الحالي: محافظة بغداد/);
  assert.match(source, /name="marketCode"/);
  const route = readFileSync(new URL("../app/api/admin/data-center/route.ts", import.meta.url), "utf8");
  assert.match(route, /market_not_enabled/);
});

test("operations center v2 covers editing, support processing, and all MVP data families", () => {
  const source = readFileSync(new URL("../app/ui/Platform.tsx", import.meta.url), "utf8");
  assert.match(source, /فتح وتدقيق/);
  assert.match(source, /حفظ التعديل/);
  assert.match(source, /معالجة طلبات المساعدة/);
  assert.match(source, /مرجع فني/);
  assert.match(source, /مدخل بيانات موحّد/);
  assert.match(source, /القهوة المحمصة/);
  assert.match(source, /التعلم والمعرفة/);
  assert.match(source, /العروض والأسعار/);
  assert.match(source, /مصادر القهوة/);
  assert.match(source, /الدليل والجهات/);
});

test("operations center v3 keeps product data, batches, support, and search governable", () => {
  const source = readFileSync(new URL("../app/ui/Platform.tsx", import.meta.url), "utf8");
  const records = readFileSync(new URL("../app/api/admin/records/route.ts", import.meta.url), "utf8");
  const review = readFileSync(new URL("../app/api/admin/review/route.ts", import.meta.url), "utf8");
  const dataCenter = readFileSync(new URL("../app/api/admin/data-center/route.ts", import.meta.url), "utf8");
  const atomicAttributes = readFileSync(new URL("../supabase/migrations/020_atomic_product_attribute_save.sql", import.meta.url), "utf8");
  assert.match(source, /حفظ والعودة إلى الطابور/);
  assert.match(source, /المواصفات الخاصة بهذه الفئة/);
  assert.match(source, /حبوب كاملة/);
  assert.match(source, /حفظ في الأرشيف/);
  assert.match(source, /التقرير الأصلي المحفوظ/);
  assert.match(source, /درجة الأولوية \(1–100\)/);
  assert.match(records, /filter_definitions\?select=/);
  assert.match(records, /rpc\/admin_update_product_v2/);
  assert.match(atomicAttributes, /delete from public\.product_attribute_values/);
  assert.match(atomicAttributes, /jsonb_to_recordset/);
  assert.match(review, /admin_publish_override/);
  assert.match(review, /المواصفة المطلوبة مفقودة/);
  assert.match(dataCenter, /category_kind_mismatch/);
  assert.match(dataCenter, /archive_batch/);
  assert.match(source, /مسح نهائي/);
  assert.match(source, /إدارة السجلات المنشورة/);
  assert.match(source, /العلامات التجارية/);
  assert.match(dataCenter, /delete_archived_batch/);
});

test("brand governance keeps coffee and equipment brands separated", () => {
  const migration = readFileSync(new URL("../supabase/migrations/019_brand_governance.sql", import.meta.url), "utf8");
  const records = readFileSync(new URL("../app/api/admin/records/route.ts", import.meta.url), "utf8");
  assert.match(migration, /create table if not exists public\.brand_product_kinds/);
  assert.match(migration, /admin_create_brand_draft/);
  assert.match(migration, /private\.is_staff/);
  assert.match(records, /brand_product_kinds\(product_kind\)/);
});

test("operations center v5 separates product master data from seller offers", () => {
  const governance = readFileSync(new URL("../supabase/migrations/021_operations_catalog_governance.sql", import.meta.url), "utf8");
  const cleanup = readFileSync(new URL("../supabase/migrations/023_cleanup_misplaced_product_attributes.sql", import.meta.url), "utf8");
  const source = readFileSync(new URL("../app/ui/Platform.tsx", import.meta.url), "utf8");
  assert.match(governance, /f\.code in \('market_price','availability'\)/);
  assert.match(governance, /f\.code='brew_methods'.*EQP-GRD-ELE/s);
  assert.match(cleanup, /delete from public\.product_attribute_values/);
  assert.match(source, /متجر البائع داخل قهوتنا/);
  assert.match(source, /السعر والتوفر لا يظهران هنا لأنهما تابعان للبائع/);
  assert.match(source, /المرفوضات والأرشيف/);
});

test("catalog media requires governed rights and accessible alternative text", () => {
  const mediaRoute = readFileSync(new URL("../app/api/admin/media/route.ts", import.meta.url), "utf8");
  const mediaSchema = readFileSync(new URL("../supabase/migrations/021_operations_catalog_governance.sql", import.meta.url), "utf8");
  const source = readFileSync(new URL("../app/ui/Platform.tsx", import.meta.url), "utf8");
  assert.match(mediaRoute, /8 \* 1024 \* 1024/);
  assert.match(mediaRoute, /altAr\.length < 2/);
  assert.match(mediaSchema, /rights_note text not null/);
  assert.match(source, /رفع الصورة وربطها الآن/);
});

test("operations center v2 migration adds support workflow and atomic catalog drafts", () => {
  const migration = readFileSync(new URL("../supabase/migrations/017_operations_center_v2.sql", import.meta.url), "utf8");
  assert.match(migration, /add column if not exists priority/);
  assert.match(migration, /assigned_to uuid references public\.profiles/);
  assert.match(migration, /admin_create_catalog_draft/);
  assert.match(migration, /p_entity_type='organization'/);
  assert.match(migration, /p_entity_type='product'/);
  assert.match(migration, /p_entity_type='content'/);
  assert.match(migration, /p_entity_type='offer'/);
  assert.match(migration, /insert into public\.origin_claims/);
  assert.match(migration, /security definer/);
});

test("coffee origins follow the draft review publication workflow", () => {
  const migration = readFileSync(new URL("../supabase/migrations/018_origin_review_workflow.sql", import.meta.url), "utf8");
  const source = readFileSync(new URL("../app/ui/Platform.tsx", import.meta.url), "utf8");
  assert.match(migration, /add column if not exists status public\.publication_status/);
  assert.match(migration, /status='published'/);
  assert.match(migration, /origin_claims_public_read/);
  assert.match(source, /key === "origins" \? "origin_claims" : key/);
  assert.match(source, /entity === "origin_claims"/);
});

test("record review API rejects unauthenticated reads and edits", async () => {
  const worker = await loadWorker("record-editor-auth");
  const id = "00000000-0000-0000-0000-000000000000";
  const read = await worker.fetch(new Request(`http://localhost/api/admin/records?entity=products&id=${id}`), runtimeEnv, runtimeContext);
  assert.equal(read.status, 401);
  const edit = await worker.fetch(new Request("http://localhost/api/admin/records", { method: "PATCH", headers: { "content-type": "application/json", origin: "http://localhost" }, body: JSON.stringify({ entity: "products", id, fields: { name_ar: "اختبار" } }) }), runtimeEnv, runtimeContext);
  assert.equal(edit.status, 401);
});

test("renders an explicit not-found experience for unknown routes", async () => {
  const worker = await loadWorker("not-found");
  const response = await worker.fetch(
    new Request("http://localhost/route-that-does-not-exist", {
      headers: { accept: "text/html" },
    }),
    runtimeEnv,
    runtimeContext,
  );

  assert.equal(response.status, 200);
  assert.match(await response.text(), /الصفحة غير موجودة/);
});

test("renders source-aligned in-review equipment pages", async () => {
  const worker = await loadWorker("reviewed-equipment");
  const roaster = await worker.fetch(
    new Request("http://localhost/equipment/roasting-machines/kuban-supreme-3", {
      headers: { accept: "text/html" },
    }),
    runtimeEnv,
    runtimeContext,
  );
  const roasterHtml = await roaster.text();
  assert.equal(roaster.status, 200);
  assert.match(roasterHtml, /Kuban Supreme 3/);
  assert.match(roasterHtml, /لا يوجد عرض محلي موثق/);
  assert.doesNotMatch(roasterHtml, /Raven 5/);

  const grinder = await worker.fetch(
    new Request("http://localhost/equipment/grinders/1zpresso-j-ultra", {
      headers: { accept: "text/html" },
    }),
    runtimeEnv,
    runtimeContext,
  );
  const grinderHtml = await grinder.text();
  assert.equal(grinder.status, 200);
  assert.match(grinderHtml, /1Zpresso J-Ultra/);
  assert.match(grinderHtml, /35–40 غ/);
});

test("rights intake fails closed when Supabase is unavailable", async () => {
  const worker = await loadWorker("rights-api");
  const response = await worker.fetch(
    new Request("http://localhost/api/rights-request", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    }),
    runtimeEnv,
    runtimeContext,
  );
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    accepted: false,
    reason: "not_configured",
  });
});

test("public search fails closed without substituting demo records", async () => {
  const worker = await loadWorker("public-search");
  const response = await worker.fetch(
    new Request("http://localhost/api/public-search?q=coffee"),
    runtimeEnv,
    runtimeContext,
  );
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    connected: false,
    results: [],
    reason: "not_configured",
  });
});

test("search defaults to intent-aware result typing", () => {
  const source = readFileSync(new URL("../app/ui/Platform.tsx", import.meta.url), "utf8");
  const governance = readFileSync(new URL("../lib/search-governance.ts", import.meta.url), "utf8");
  assert.match(source, /الأدق تلقائياً/);
  assert.match(source, /search-event/);
  assert.match(source, /state\.explanation/);
  assert.match(source, /groupedReviewResults/);
  assert.match(source, /إثيوبيا — قوجي/);
  assert.match(governance, /buildSearchPlan/);
  assert.match(governance, /normalizeSearchText/);
  assert.match(governance, /\.replace\(\/ة\/g, "ه"\)/);
  assert.match(governance, /expandArabicStorageVariants/);
  assert.match(governance, /لم نجد قاعدة خاصة/);
});

test("Arabic search normalization handles common spelling differences", () => {
  assert.equal(normalizeSearchText("أرض قهوة"), normalizeSearchText("ارض قهوه"));
  assert.ok(expandArabicStorageVariants("ارض").includes("أرض"));
  assert.ok(expandArabicStorageVariants("قهوه").includes("قهوة"));
  assert.ok(expandArabicStorageVariants("الاعظميه").includes("الأعظمية"));
});

test("Baghdad directory keeps area options stable while published data loads", () => {
  const source = readFileSync(new URL("../app/ui/Platform.tsx", import.meta.url), "utf8");
  assert.match(source, /const districts = directory\.loading[\s\S]*\? \[\]/);
  assert.match(source, /disabled=\{directory\.loading\}/);
  assert.match(source, /جارٍ تحميل المناطق/);
  assert.match(source, /normalizeSearchText\(searchable\)\.includes\(normalizedQuery\)/);
  assert.match(source, /function directoryLocationArea/);
  assert.match(source, /location\.district_ar \|\| location\.name_ar/);
});

test("search quality event endpoint fails closed without Supabase", async () => {
  const worker = await loadWorker("search-event");
  const response = await worker.fetch(new Request("http://localhost/api/search-event", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://localhost" },
    body: JSON.stringify({ query: "قهوة", intent: "broad", requestedType: "smart", resultCount: 0, resultCounts: {} }),
  }), runtimeEnv, runtimeContext);
  assert.equal(response.status, 503);
});

test("search governance migration enforces RLS and human approval", () => {
  const migration = readFileSync(new URL("../supabase/migrations/011_search_governance_v1.sql", import.meta.url), "utf8");
  assert.match(migration, /alter table public\.search_terms enable row level security/);
  assert.match(migration, /search_query_events_zero_results_idx/);
  assert.match(migration, /AI suggestions remain draft until staff approval/);
  assert.match(migration, /ماكينة تحميص/);
  assert.match(migration, /محمصة/);
});

test("closed-beta search correction keeps generic coffee queries out of organizations", () => {
  const migration = readFileSync(new URL("../supabase/migrations/014_closed_beta_search_corrections.sql", import.meta.url), "utf8");
  assert.match(migration, /array\['product', 'origin', 'content'\]/);
  assert.match(migration, /normalized_term = 'قهوة'/);
});

test("Baghdad directory cards summarize every published branch", () => {
  const source = readFileSync(
    new URL("../app/ui/Platform.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /function arabicBranchCount/);
  assert.match(source, /function organizationBranchSummary/);
  assert.match(source, /branches\.names\.join\(" · "\)/);
  assert.doesNotMatch(source, /organization\.locations\[0\]/);
});

test("published directory UI uses Arabic verification and role labels", () => {
  const source = readFileSync(
    new URL("../app/ui/Platform.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /t2_source_checked: "موثّق المصدر"/);
  assert.match(source, /organizationRoleLabel\(role\.role_type\)/);
  assert.match(source, /organizationVerificationLabel\(/);
  assert.match(source, /className="section-head branch-section-head"/);
});

test("public products API fails closed without exposing review records", async () => {
  const worker = await loadWorker("public-products");
  const response = await worker.fetch(
    new Request("http://localhost/api/public-products?kind=equipment"),
    runtimeEnv,
    runtimeContext,
  );
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    connected: false,
    products: [],
    reason: "not_configured",
  });
});

test("origins and content APIs fail closed without substituting drafts", async () => {
  const worker = await loadWorker("public-relations");
  for (const route of ["/api/public-origins", "/api/public-content"]) {
    const response = await worker.fetch(new Request(`http://localhost${route}`), runtimeEnv, runtimeContext);
    assert.equal(response.status, 503);
    const payload = await response.json();
    assert.equal(payload.connected, false);
    assert.deepEqual(payload.countries || payload.contents, []);
  }
});

test("labels origin and article examples as internal unpublished previews", async () => {
  const worker = await loadWorker("relation-previews");
  const origin = await worker.fetch(
    new Request("http://localhost/origins/ethiopia/guji", { headers: { accept: "text/html" } }),
    runtimeEnv,
    runtimeContext,
  );
  assert.equal(origin.status, 200);
  assert.match(await origin.text(), /جارٍ تحميل المصادر المنشورة/);

  const article = await worker.fetch(
    new Request("http://localhost/knowledge/v60-guide", { headers: { accept: "text/html" } }),
    runtimeEnv,
    runtimeContext,
  );
  const articleHtml = await article.text();
  assert.equal(article.status, 200);
  assert.match(articleHtml, /معاينة تحريرية غير منشورة/);
  assert.match(articleHtml, /اعتماد النص والمصادر/);
});

test("waits for published products before rendering the deduplicated review preview", async () => {
  const worker = await loadWorker("dynamic-product");
  const product = await worker.fetch(
    new Request("http://localhost/equipment/future-published-product", {
      headers: { accept: "text/html" },
    }),
    runtimeEnv,
    runtimeContext,
  );
  assert.equal(product.status, 200);
  assert.match(await product.text(), /جارٍ تحميل المنتج المنشور/);

  const listing = await worker.fetch(
    new Request("http://localhost/equipment/grinders", {
      headers: { accept: "text/html" },
    }),
    runtimeEnv,
    runtimeContext,
  );
  const listingHtml = await listing.text();
  assert.equal(listing.status, 200);
  assert.match(listingHtml, /جارٍ تحميل المنتجات المنشورة/);
  assert.doesNotMatch(listingHtml, /سجلات التصميم والمراجعة/);
});

test("renders category-specific product filters", async () => {
  const source = readFileSync(
    new URL("../app/ui/Platform.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /brand: publishedItem\.brand \|\| reviewItem\.brand/);
  assert.match(source, /brand: "DF Grinders"/);
  const worker = await loadWorker("catalog-filters");
  const grinders = await worker.fetch(
    new Request("http://localhost/equipment/grinders", {
      headers: { accept: "text/html" },
    }),
    runtimeEnv,
    runtimeContext,
  );
  const grinderHtml = await grinders.text();
  assert.equal(grinders.status, 200);
  assert.match(grinderHtml, /بحث داخل النتائج/);
  assert.match(grinderHtml, /نمط التشغيل/);
  assert.match(grinderHtml, /شكل الشفرات/);
  assert.match(grinderHtml, /الفلاتر تطبق مباشرة/);
  assert.match(grinderHtml, /نحفظ الفلاتر والترتيب عند فتح المنتج والعودة/);

  const roasters = await worker.fetch(
    new Request("http://localhost/equipment/roasting-machines", {
      headers: { accept: "text/html" },
    }),
    runtimeEnv,
    runtimeContext,
  );
  const roasterHtml = await roasters.text();
  assert.equal(roasters.status, 200);
  assert.match(roasterHtml, /فئة الاستخدام/);
  assert.match(roasterHtml, /مصدر الحرارة/);
});

test("keeps review product offers non-public and provides a return journey", async () => {
  const worker = await loadWorker("review-product-journey");
  const response = await worker.fetch(
    new Request("http://localhost/equipment/grinders/df54-v4?from=%2Fequipment%2Fgrinders", {
      headers: { accept: "text/html" },
    }),
    runtimeEnv,
    runtimeContext,
  );
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.match(html, /العودة إلى النتائج المحفوظة/);
  assert.match(html, /عرض مرصود غير منشور/);
  assert.match(html, /السعر والتوفر يعاد التحقق منهما عند الاعتماد/);
  assert.doesNotMatch(html, /الانتقال إلى موقع البائع/);
});

test("renders bounded comparison and device-local favorites journeys", async () => {
  const worker = await loadWorker("saved-journeys");
  const compare = await worker.fetch(
    new Request("http://localhost/compare", {
      headers: { accept: "text/html" },
    }),
    runtimeEnv,
    runtimeContext,
  );
  const compareHtml = await compare.text();
  assert.equal(compare.status, 200);
  assert.match(compareHtml, /من منتجين إلى أربعة منتجات/);
  assert.match(compareHtml, /مجموعة المقارنة نفسها/);

  const favorites = await worker.fetch(
    new Request("http://localhost/favorites", {
      headers: { accept: "text/html" },
    }),
    runtimeEnv,
    runtimeContext,
  );
  assert.equal(favorites.status, 200);
  assert.match(await favorites.text(), /جارٍ تحميل العناصر المحفوظة/);
});

test("waits for the public directory before rendering deduplicated review records", async () => {
  const worker = await loadWorker("directory-review");
  const directory = await worker.fetch(
    new Request("http://localhost/directory", {
      headers: { accept: "text/html" },
    }),
    runtimeEnv,
    runtimeContext,
  );
  const directoryHtml = await directory.text();
  assert.equal(directory.status, 200);
  assert.match(directoryHtml, /بحث داخل الدليل/);
  assert.match(directoryHtml, /جارٍ تحميل الدليل المنشور/);
  assert.doesNotMatch(directoryHtml, /جهات بغداد قيد المراجعة/);

  const held = await worker.fetch(
    new Request(
      "http://localhost/directory/review/italian-coffee-store-iraq",
      { headers: { accept: "text/html" } },
    ),
    runtimeEnv,
    runtimeContext,
  );
  const heldHtml = await held.text();
  assert.equal(held.status, 200);
  assert.match(heldHtml, /المتجر الإيطالي للقهوة/);
  assert.match(heldHtml, /سبب التعليق/);
  assert.match(heldHtml, /مكتب أربيل/);
  assert.match(heldHtml, /غير منشور/);
});

test("renders the structured coffee finder journey", async () => {
  const source = readFileSync(
    new URL("../app/ui/Platform.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /restoredAnswers\.method === "turkish"/);
  assert.match(
    source,
    /question\.key === "method" && option\.value === "turkish"/,
  );
  assert.match(source, /method: "turkish", form: "ground"/);
  const worker = await loadWorker("coffee-finder");
  const response = await worker.fetch(
    new Request("http://localhost/coffee/finder", {
      headers: { accept: "text/html" },
    }),
    runtimeEnv,
    runtimeContext,
  );
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.match(html, /السؤال[\s\S]*1[\s\S]*من[\s\S]*4/);
  assert.match(html, /أي نوع قهوة تفضل/);
  assert.match(html, /V60 وأدوات التقطير/);
  assert.match(html, /لست متأكداً/);
});

test("catalog entry supports checkbox multi-values and persists new-record media against the created id", () => {
  const source = readFileSync(new URL("../app/ui/Platform.tsx", import.meta.url), "utf8");
  assert.match(source, /function MultiChoiceField/);
  assert.match(source, /type="checkbox" checked=\{selected\.includes\(option\)\}/);
  assert.match(source, /result\.created\?\.id \|\| result\.id/);
  assert.match(source, /uploadCatalogMedia\(entityMap\[pendingEntityType\], createdId/);
  assert.doesNotMatch(source, /يمكن اختيار أكثر من قيمة باستخدام Ctrl/);
});

test("operations center v3 separates workspaces and previews drafts before saving", () => {
  const ui = readFileSync(new URL("../app/ui/Platform.tsx", import.meta.url), "utf8");
  const admin = readFileSync(new URL("../lib/supabase-admin.ts", import.meta.url), "utf8");
  const records = readFileSync(new URL("../app/api/admin/records/route.ts", import.meta.url), "utf8");
  assert.match(ui, /operations-workspace-nav/);
  assert.match(ui, /معاينة المسودة قبل إنشائها/);
  assert.match(ui, /السجلات والملاحظات المشكوك فيها/);
  assert.match(ui, /الصور والملفات/);
  assert.match(admin, /requireStaff/);
  assert.match(records, /restore_record_revision/);
});

test("operations aligns published taxonomy and exposes stateful rights actions", () => {
  const ui = readFileSync(new URL("../app/ui/Platform.tsx", import.meta.url), "utf8");
  const api = readFileSync(new URL("../app/api/admin/review/route.ts", import.meta.url), "utf8");
  assert.match(ui, /العائلة الرئيسية للمعدات<select value=\{productFamilyId\}/);
  assert.match(ui, /التصنيف الفرعي<select value=\{productCategoryId\}/);
  assert.match(ui, /بانتظار دليل إضافي/);
  assert.match(ui, /استئناف المراجعة بعد وصول الدليل/);
  assert.match(api, /const taxonomyPath/);
  assert.match(api, /requester_email,requester_phone,details,evidence_reference/);
});

test("media intake reports exact validation failures and compresses below the Sites request limit", () => {
  const api = readFileSync(new URL("../app/api/admin/media/route.ts", import.meta.url), "utf8");
  const ui = readFileSync(new URL("../app/ui/Platform.tsx", import.meta.url), "utf8");
  assert.match(api, /MAX_MEDIA_BYTES = 8 \* 1024 \* 1024/);
  assert.match(api, /reason: "file_too_large"/);
  assert.match(api, /reason: "unsupported_type"/);
  assert.match(api, /reason: "alt_required"/);
  assert.match(api, /reason: "rights_required"/);
  assert.match(api, /reason: "storage_rejected"/);
  assert.match(api, /reason: objectUploaded \? "media_link_failed"/);
  assert.match(ui, /تم اختيار:/);
  assert.match(ui, /MAX_MEDIA_BYTES = 1024 \* 1024/);
  assert.match(ui, /request_too_large/);
  assert.match(ui, /className="entity-media-upload" onSubmit=\{addMedia\} noValidate/);
  assert.match(ui, /3\. المصدر والحقوق/);
});

test("seller catalog is prioritized and published records use aligned dropdown filters", () => {
  const ui = readFileSync(new URL("../app/ui/Platform.tsx", import.meta.url), "utf8");
  const sellerCatalogIndex = ui.indexOf("seller-catalog seller-catalog-priority");
  const rolesIndex = ui.indexOf("الأدوار والخدمات", sellerCatalogIndex);
  assert.ok(sellerCatalogIndex > 0 && rolesIndex > sellerCatalogIndex);
  assert.match(ui, /قسم السجل<select value=\{publishedType\}/);
  assert.match(ui, /الفئة المتوافقة<select value=\{publishedGroup\}/);
  assert.match(ui, /option value="consumables">مستهلكات/);
  assert.match(ui, /product\.product_kind === "roasted_coffee" \? "coffee" : "equipment"/);
  assert.match(ui, /قسم السجل<select value=\{entrySection\}/);
  assert.match(ui, /نفس ترتيب وفلاتر «إدارة السجلات المنشورة»/);
});

test("catalog intake prevents duplicate products brands and seller offers", () => {
  const api = readFileSync(new URL("../app/api/admin/data-center/route.ts", import.meta.url), "utf8");
  assert.match(api, /reason: "duplicate_product"/);
  assert.match(api, /reason: "duplicate_brand"/);
  assert.match(api, /reason: "duplicate_offer"/);
});

test("commerce keeps customers on internal seller pages and treats external links as evidence", () => {
  const ui = readFileSync(new URL("../app/ui/Platform.tsx", import.meta.url), "utf8");
  const migration = readFileSync(new URL("../supabase/migrations/024_internal_seller_pages.sql", import.meta.url), "utf8");
  assert.match(ui, /فتح تفاصيل عرض البائع داخل قهوتنا/);
  assert.match(ui, /href=\{`\/directory\/\$\{offer\.organizations\.slug\}\/products\/\$\{product\.slug\}`\}/);
  assert.doesNotMatch(ui, /الانتقال إلى موقع البائع ↗/);
  assert.doesNotMatch(ui, /href=\{organization\.website_url\}/);
  assert.match(migration, /internal_seller_pages/);
});

test("seller offers remain distinct from master products and expose their own media", () => {
  const ui = readFileSync(new URL("../app/ui/Platform.tsx", import.meta.url), "utf8");
  const api = readFileSync(new URL("../app/api/public-products/route.ts", import.meta.url), "utf8");
  assert.match(api, /entity_table=eq\.offers/);
  assert.match(api, /offers: product\.offers\.map/);
  assert.match(ui, /offer\.media\?\.\[0\] \|\| product\.media\?\.\[0\]/);
  assert.match(ui, /هذه صفحة عرض البائع، وليست سجل المنتج الرئيسي/);
  assert.match(ui, /بطاقة المنتج الرئيسية/);
  assert.match(ui, /عرض بائع مرتبط بمنتج/);
  assert.match(ui, /تعديل عرض البائع/);
});

test("catalog drafts report the exact missing field and allow manual brand intake", () => {
  const ui = readFileSync(new URL("../app/ui/Platform.tsx", import.meta.url), "utf8");
  assert.match(ui, /className="catalog-draft-form" onSubmit=\{submit\} noValidate/);
  assert.match(ui, /لا يمكن حفظ المسودة: أكمل حقل/);
  assert.match(ui, /تعذر الاتصال بقاعدة البيانات\. لم تُنشأ المسودة/);
  assert.match(ui, /إدخال علامة جديدة يدوياً/);
});

test("global navigation exposes working menu back and contextual comparison", () => {
  const ui = readFileSync(new URL("../app/ui/Platform.tsx", import.meta.url), "utf8");
  assert.match(ui, /id="site-menu-panel"/);
  assert.match(ui, /الرجوع إلى الصفحة السابقة/);
  assert.match(ui, /className="comparison-dock"/);
  assert.match(ui, /منتجات من المجموعة نفسها/);
});

test("large catalog images are optimized in the browser before upload", () => {
  const ui = readFileSync(new URL("../app/ui/Platform.tsx", import.meta.url), "utf8");
  assert.match(ui, /async function prepareCatalogImage/);
  assert.match(ui, /createImageBitmap\(file\)/);
  assert.match(ui, /canvas\.toBlob\(resolve, "image\/webp"/);
  assert.match(ui, /سيُحسّن الحجم تلقائياً/);
});

test("catalog media uses a carousel and exact full-name search suppresses alias noise", () => {
  const ui = readFileSync(new URL("../app/ui/Platform.tsx", import.meta.url), "utf8");
  const search = readFileSync(new URL("../app/api/public-search/route.ts", import.meta.url), "utf8");
  assert.match(ui, /function MediaCarousel/);
  assert.doesNotMatch(ui, /صور من عروض البائعين إلى حين اعتماد صورة البطاقة الرئيسية/);
  assert.match(ui, /items=\{product\.media\}/);
  assert.match(ui, /لا توجد صورة معتمدة لبطاقة المنتج الرئيسية/);
  assert.match(ui, /بطاقة منتج رئيسية/);
  assert.match(ui, /منتج لدى بائع/);
  assert.match(search, /exactTitleResults\.length \? exactTitleResults/);
});

test("operations fixes media loading and separates coffee form from seller filtering", () => {
  const mediaApi = readFileSync(new URL("../app/api/admin/media/route.ts", import.meta.url), "utf8");
  const dataApi = readFileSync(new URL("../app/api/admin/data-center/route.ts", import.meta.url), "utf8");
  const ui = readFileSync(new URL("../app/ui/Platform.tsx", import.meta.url), "utf8");
  assert.match(mediaApi, /requireStaff\(request\)/);
  assert.doesNotMatch(mediaApi, /requireAdmin\(request\)/);
  assert.match(dataApi, /product_attribute_values\(value_text,value_json,field_definitions\(code\)\)/);
  assert.match(ui, /شكل القهوة — الفئة الدقيقة/);
  assert.match(ui, /حبوب كاملة/);
  assert.match(ui, /مطحونة/);
  assert.match(ui, /carousel-arrow previous/);
  assert.match(ui, /carousel-image-button/);
});

test("directory support and archives follow the governed operational workflow", () => {
  const ui = readFileSync(new URL("../app/ui/Platform.tsx", import.meta.url), "utf8");
  const supportApi = readFileSync(new URL("../app/api/admin/review/route.ts", import.meta.url), "utf8");
  const migration = readFileSync(new URL("../supabase/migrations/027_support_resolution_archive.sql", import.meta.url), "utf8");
  assert.match(ui, /نوع الجهة/);
  assert.match(ui, /إرسال نتيجة الحل عبر واتساب/);
  assert.match(ui, /إحالة بالبريد إلى فريق الدعم/);
  assert.match(ui, /function ArchivedImportBatches/);
  assert.match(supportApi, /delete_support_request/);
  assert.match(supportApi, /mark_support_reply/);
  assert.match(migration, /support_requests_admin_delete/);
});

test("media library follows the platform tree and every organization role", () => {
  const ui = readFileSync(new URL("../app/ui/Platform.tsx", import.meta.url), "utf8");
  const mediaUi = ui.slice(ui.indexOf("function MediaLibrary"), ui.indexOf("type PartnerSubmission"));
  const mediaApi = readFileSync(new URL("../app/api/admin/media/route.ts", import.meta.url), "utf8");
  const taxonomyApi = readFileSync(new URL("../app/api/admin/taxonomy/route.ts", import.meta.url), "utf8");
  const publicApi = readFileSync(new URL("../app/api/public-products/route.ts", import.meta.url), "utf8");
  assert.match(mediaUi, /fetch\("\/api\/admin\/taxonomy\?view=tree&consumer=media-workspace-v2"/);
  assert.match(mediaUi, /credentials: "same-origin"/);
  assert.match(mediaUi, /قسم المنصة<select value=\{rootCategoryId\}/);
  assert.match(mediaUi, /const \[taxonomyNodeId, setTaxonomyNodeId\] = useState\("all"\)/);
  assert.match(mediaUi, /const \[familyCategoryId, setFamilyCategoryId\] = useState\("all"\)/);
  assert.match(mediaUi, /category\.navigation_parent_id === rootCategoryId/);
  assert.match(mediaUi, /category\.navigation_parent_id === familyCategoryId/);
  assert.match(mediaUi, /العائلة الرئيسية<select value=\{familyCategoryId\}/);
  assert.match(mediaUi, /التصنيف الفرعي<select value=\{taxonomyNodeId\}/);
  assert.match(mediaUi, /اختر العائلة الرئيسية أولاً/);
  assert.match(mediaUi, /حتى لو لم توجد صور/);
  assert.match(mediaUi, /const matchesTaxonomy = \(row: MediaLibraryRow\) => row\.entity === "organizations" \|\| !selectedTaxonomyId \|\| row\.categoryPathIds\.includes\(selectedTaxonomyId\)/);
  assert.match(mediaUi, /matchesTaxonomy\(row\)/);
  assert.doesNotMatch(mediaUi, /participantRecord === "organizations" \|\| !selectedTaxonomyId/);
  assert.match(mediaUi, /categoryPath\(row\.categoryId\)/);
  assert.doesNotMatch(mediaUi, /productScoped\.some/);
  assert.doesNotMatch(mediaUi, /cascadeLevels/);
  assert.doesNotMatch(mediaUi, /<option value="coffee">القهوة<\/option>/);
  assert.doesNotMatch(mediaUi, /<option value="equipment">المعدات<\/option>/);
  assert.match(mediaUi, /organizationRoles \|\| \[row\.organizationRole/);
  assert.match(mediaUi, /published-filter-grid media-filter-grid/);
  assert.doesNotMatch(mediaUi, /قسم المنتج<select value=\{kind\}/);
  assert.match(mediaApi, /organizationRoles: row\.organizations\?\.organization_roles\.map/);
  assert.match(mediaApi, /const categoryPathIds = \(categoryId: string \| null\)/);
  assert.match(mediaApi, /categoryPathIds: categoryPathIds\(category\?\.id \|\| null\)/);
  assert.doesNotMatch(mediaApi, /taxonomy: categories/);
  assert.match(taxonomyApi, /view === "tree"/);
  assert.match(taxonomyApi, /requireStaff\(request\)/);
  assert.match(publicApi, /"cache-control": "no-store, max-age=0"/);
});

test("equipment catalog and Operations share the governed two-tier navigation projection", () => {
  const ui = readFileSync(new URL("../app/ui/Platform.tsx", import.meta.url), "utf8");
  const publicApi = readFileSync(new URL("../app/api/public-products/route.ts", import.meta.url), "utf8");
  const migration = readFileSync(new URL("../supabase/migrations/034_equipment_catalog_navigation_alignment.sql", import.meta.url), "utf8");
  for (const path of ["/equipment/grinders", "/equipment/brew-tools", "/equipment/brew-machines", "/equipment/roasting-machines", "/equipment/care"]) {
    const definition = ui.slice(ui.indexOf(`path: "${path}"`), ui.indexOf(`path: "${path}"`) + 420);
    assert.match(definition, /kind: "listing"/, `${path} must open product cards directly`);
  }
  for (const label of ["مطاحن القهوة", "أدوات التحضير", "مكائن التحضير", "مكائن التحميص", "العناية والصيانة", "محامص عينات", "أوعية التقديم والموقتات"]) {
    assert.match(migration, new RegExp(label));
  }
  assert.match(migration, /v_family_count <> 5 or v_filter_count <> 17/);
  assert.match(migration, /catalog_family_id/);
  assert.match(migration, /catalog_filter_id/);
  assert.match(publicApi, /assigned\.catalog_family_id === requestedCategory\.id/);
  assert.match(publicApi, /assigned\.catalog_filter_id === requestedCategory\.id/);
  assert.match(ui, /العائلة الرئيسية للمعدات<select value=\{productFamilyId\}/);
  assert.match(ui, /categoryOptions=\{published\.categoryOptions\}/);
});

test("quality desk distinguishes physical venues and processes unlinked findings", () => {
  const ui = readFileSync(new URL("../app/ui/Platform.tsx", import.meta.url), "utf8");
  const reviewApi = readFileSync(new URL("../app/api/admin/review/route.ts", import.meta.url), "utf8");
  assert.match(reviewApi, /needsPhysicalLocation/);
  assert.match(reviewApi, /hasContactRoute/);
  assert.match(reviewApi, /process_quality_issue/);
  assert.match(reviewApi, /target_not_found/);
  assert.match(reviewApi, /source_row_number,raw_payload,normalized_payload/);
  assert.match(ui, /عرض الملاحظة ومعالجتها/);
  assert.match(ui, /ربط الملاحظة بسجل/);
  assert.match(ui, /حفظ القرار وتوثيقه/);
  assert.match(ui, /عرض البيانات الأصلية الواردة/);
});

test("STEP2 taxonomy migrations harden privileges and expose governed RPCs", () => {
  const governance = readFileSync(new URL("../supabase/migrations/032_step2_privilege_taxonomy_governance.sql", import.meta.url), "utf8");
  const rpc = readFileSync(new URL("../supabase/migrations/033_step2_taxonomy_admin_rpc.sql", import.meta.url), "utf8");
  assert.match(governance, /revoke truncate, trigger, references/);
  assert.match(governance, /v_dangerous <> 0/);
  assert.match(governance, /step2_categories_admin_insert/);
  assert.match(rpc, /security invoker/g);
  assert.match(rpc, /taxonomy_version_conflict/);
  assert.match(rpc, /taxonomy_replace_category_filters/);
  assert.doesNotMatch(rpc, /service_role/);
});

test("STEP2 taxonomy writes are admin-only while its staff tree is read-only", () => {
  const route = readFileSync(new URL("../app/api/admin/taxonomy/route.ts", import.meta.url), "utf8");
  assert.match(route, /requireAdmin\(request\)/);
  assert.match(route, /view === "tree"/);
  assert.match(route, /requireStaff\(request\)/);
  assert.match(route, /sameOrigin\(request\)/);
  assert.match(route, /65_536/);
  assert.match(route, /rpc\/admin_upsert_category/);
  assert.match(route, /rpc\/admin_replace_category_filters/);
  assert.match(route, /rpc\/admin_transition_taxonomy_status/);
});

test("STEP2 taxonomy input validation rejects malformed and duplicate definitions", () => {
  assert.throws(() => categoryPayload({ code: "bad code", slug: "ok", name_ar: "اسم", name_en: "Name" }), TaxonomyInputError);
  assert.throws(() => fieldPayload({ code: "valid_code", name_ar: "حقل", name_en: "Field", data_type: "money" }), TaxonomyInputError);
  assert.throws(() => filterPayload([
    { field_definition_id: "11111111-1111-4111-8111-111111111111", operator: "equals", is_visible: true },
    { field_definition_id: "11111111-1111-4111-8111-111111111111", operator: "range", is_visible: true },
  ]), /duplicate_filter_fields/);
});

test("STEP2 TaxonomyWorkspace is restricted to admins and has no delete workflow", () => {
  const platform = readFileSync(new URL("../app/ui/Platform.tsx", import.meta.url), "utf8");
  const workspace = readFileSync(new URL("../app/ui/admin/TaxonomyWorkspace.tsx", import.meta.url), "utf8");
  assert.match(platform, /adminData\.profile\.role === "admin" && <TaxonomyWorkspace/);
  assert.match(workspace, /validate_change/);
  assert.match(workspace, /expectedUpdatedAt/);
  assert.match(workspace, /COF-GREEN/);
  assert.match(workspace, /<form onSubmit=\{saveField\}>/);
  assert.match(workspace, /action: "create_field"/);
  assert.match(workspace, /حفظ الحقل الجديد/);
  assert.match(workspace, /جارٍ الحفظ…/);
  assert.doesNotMatch(workspace, /method:\s*"DELETE"/);
});

test("Phase 5 migration makes the legacy attachment outcome unambiguously attached", () => {
  const migration = readFileSync(new URL("../supabase/migrations/041_phase5_attached_record_contract.sql", import.meta.url), "utf8");
  assert.match(migration, /'status','attached'/);
  assert.match(migration, /'attach_'\|\|p_entity_type\|\|'_record'/);
  assert.match(migration, /security invoker/);
  assert.match(migration, /set search_path = ''/);
  assert.match(migration, /revoke all on function public\.admin_create_catalog_draft\(text,jsonb\) from public,anon/);
  assert.doesNotMatch(migration, /case when p_entity_type='origin' then 'attached' else 'draft' end/);
});

test("Phase 5 product Add/Edit uses the server-owned capability contract atomically", () => {
  const dataCenter = readFileSync(new URL("../app/api/admin/data-center/route.ts", import.meta.url), "utf8");
  const records = readFileSync(new URL("../app/api/admin/records/route.ts", import.meta.url), "utf8");
  const ui = readFileSync(new URL("../app/ui/Platform.tsx", import.meta.url), "utf8");
  assert.match(dataCenter, /rpc\/admin_record_contract_revision/);
  assert.match(dataCenter, /rpc\/admin_create_product_draft_v2/);
  assert.match(dataCenter, /p_contract_revision: body\.contractRevision/);
  assert.doesNotMatch(dataCenter, /body\.entityType === "origin" \? \{ \.\.\.created, status: "draft" \}/);
  assert.match(records, /rpc\/admin_update_product_v2/);
  assert.match(records, /handledAtomically = true/);
  assert.match(ui, /contractRevision: data\?\.recordContractRevision/);
  assert.match(ui, /تم إرفاق المنتج ومواصفاته ذرياً/);
});

test("Phase 5 attribute serialization rejects malformed and duplicate values", () => {
  const definitions = [
    { id: "11111111-1111-4111-8111-111111111111", data_type: "integer", unit_code: "mm" },
    { id: "22222222-2222-4222-8222-222222222222", data_type: "enum", allowed_values: ["flat", "conical"] },
  ];
  assert.deepEqual(serializeProductAttributes([
    { fieldId: definitions[0].id, value: "54" },
    { fieldId: definitions[1].id, value: "flat" },
  ], definitions), [
    { field_definition_id: definitions[0].id, unit_code: "mm", value_integer: 54 },
    { field_definition_id: definitions[1].id, unit_code: null, value_text: "flat" },
  ]);
  assert.throws(() => serializeProductAttributes([
    { fieldId: definitions[1].id, value: "invalid" },
  ], definitions), ProductAttributeError);
  assert.throws(() => serializeProductAttributes([
    { fieldId: definitions[0].id, value: "54" },
    { fieldId: definitions[0].id, value: "55" },
  ], definitions), /duplicate_attribute/);
});

test("GitHub CI gates Phase branches and protects the Baghdad beta deployment", () => {
  const workflow = readFileSync(new URL("../.github/workflows/coffee-platform.yml", import.meta.url), "utf8");
  assert.match(workflow, /"phase5\/\*\*"/);
  assert.match(workflow, /pull_request:[\s\S]*?- main/);
  assert.match(workflow, /name: Quality gate/);
  assert.match(workflow, /run: npm run lint/);
  assert.match(workflow, /run: npm test/);
  assert.match(workflow, /run: npm run deploy:dry-run/);
  assert.match(workflow, /needs: quality/);
  assert.match(workflow, /github\.ref == 'refs\/heads\/main'/);
  assert.match(workflow, /name: baghdad-beta/);
  assert.match(workflow, /include-hidden-files: true/);
  assert.doesNotMatch(workflow, /service[_-]?role/i);

  const actionPins = [...workflow.matchAll(/uses:\s+[^@\s]+@([0-9a-f]{40})/g)];
  assert.equal(actionPins.length, 7);
});

test("Cloudflare beta config deploys the built Worker with required Supabase bindings", () => {
  const config = JSON.parse(readFileSync(new URL("../wrangler.deploy.jsonc", import.meta.url), "utf8"));
  assert.equal(config.name, "coffee-platform-baghdad-beta");
  assert.equal(config.main, "dist/server/index.js");
  assert.equal(config.assets?.directory, "dist/client");
  assert.equal(config.assets?.binding, "ASSETS");
  assert.equal(config.no_bundle, true);
  assert.deepEqual(config.secrets?.required, ["SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY"]);
});

import { expect, test, type Page } from "playwright/test";
import { readFileSync } from "node:fs";

type Fixture = {
  expectedCategoryCount: number;
  equipmentFamilies: Record<string, string[]>;
  granularEquipment: Array<[string, string]>;
  publishedEquipmentProducts: Array<[string, string, string | null]>;
};

const fixture = JSON.parse(
  readFileSync(new URL("./fixtures/taxonomy-staging-2026-08-26.json", import.meta.url), "utf8"),
) as Fixture;

const familyRoutes: Record<string, string> = {
  "EQP-GRD": "/equipment/grinders",
  "EQP-BRW": "/equipment/brew-tools",
  "EQP-MCH": "/equipment/brew-machines",
  "EQP-ROA": "/equipment/roasting-machines",
  "EQP-WCS": "/equipment/care",
};

const adminEmail = process.env.OPERATIONS_ADMIN_EMAIL || "";
const adminPassword = process.env.OPERATIONS_ADMIN_PASSWORD || "";
const hasAdminCredentials = Boolean(adminEmail && adminPassword);

async function loginOperations(page: Page) {
  await page.goto("/operations");
  const login = page.locator("form.admin-login");
  if (await login.isVisible()) {
    await login.locator('input[name="email"]').fill(adminEmail);
    await login.locator('input[name="password"]').fill(adminPassword);
    await login.getByRole("button", { name: "دخول الإدارة" }).click();
  }
  await expect(page.locator(".operations-workspace-nav")).toBeVisible();
}

async function optionTexts(select: ReturnType<Page["locator"]>) {
  return select.locator("option").evaluateAll((nodes) =>
    nodes.map((node) => (node.textContent || "").trim()).filter(Boolean),
  );
}

test.describe("public taxonomy parity", () => {
  for (const [familyCode, filterCodes] of Object.entries(fixture.equipmentFamilies)) {
    test(`${familyCode}: API and catalog sidebar match the audited Level 2 projection`, async ({ page, request }) => {
      const response = await request.get(`/api/public-products?category=${familyCode}&navigationRoot=${familyCode}`);
      expect(response.status()).toBe(200);
      const payload = await response.json();
      expect(payload.connected).toBe(true);
      expect(payload.categoryOptions.map((row: { code: string }) => row.code)).toEqual(filterCodes);

      const expectedFamilySlugs = fixture.publishedEquipmentProducts
        .filter(([, family]) => family === familyCode)
        .map(([slug]) => slug)
        .sort();
      expect(payload.products.map((row: { slug: string }) => row.slug).sort()).toEqual(expectedFamilySlugs);

      await page.goto(familyRoutes[familyCode]);
      const sidebar = page.locator("aside.filters");
      await expect(sidebar).toBeVisible();
      const select = sidebar.getByLabel("التصنيف الفرعي");
      await expect(select).toBeVisible();
      const renderedCodes = await select.locator("option").evaluateAll((nodes) =>
        nodes.slice(1).map((node) => (node as HTMLOptionElement).value),
      );
      expect(renderedCodes).toEqual(filterCodes);
    });
  }

  for (const filterCode of Object.values(fixture.equipmentFamilies).flat()) {
    test(`${filterCode}: public API returns every product mapped to the Level 2 filter`, async ({ request }) => {
      const response = await request.get(`/api/public-products?category=${filterCode}`);
      expect(response.status()).toBe(200);
      const payload = await response.json();
      expect(payload.connected).toBe(true);
      const expected = fixture.publishedEquipmentProducts
        .filter(([, , filter]) => filter === filterCode)
        .map(([slug]) => slug)
        .sort();
      expect(payload.products.map((row: { slug: string }) => row.slug).sort()).toEqual(expected);
    });
  }

  test("published equipment has no item omitted from every Level 2 filter", () => {
    const missing = fixture.publishedEquipmentProducts
      .filter(([, , filter]) => filter === null)
      .map(([slug, family]) => ({ slug, family }));
    expect(missing, "Published products with catalog_filter_id IS NULL").toEqual([]);
  });
});

test.describe("operations taxonomy visibility", () => {
  test("required Supabase staff credentials are configured", () => {
    expect(adminEmail, "Set OPERATIONS_ADMIN_EMAIL for read-only UI inspection").not.toBe("");
    expect(adminPassword, "Set OPERATIONS_ADMIN_PASSWORD for read-only UI inspection").not.toBe("");
  });

  test.describe("authenticated read-only assertions", () => {
    test.skip(!hasAdminCredentials, "Operations credentials are unavailable in this execution environment");

    test.beforeEach(async ({ page }) => loginOperations(page));

    test("admin workspace count equals the audited database count and exposes every granular entry", async ({ page }) => {
      await page.getByRole("button", { name: "التصنيفات والفلاتر" }).click();
      const workspace = page.locator("#operations-taxonomy");
      await expect(workspace).toBeVisible();
      await expect(workspace.locator(".taxonomy-summary b").first()).toContainText(String(fixture.expectedCategoryCount));
      await workspace.getByLabel("عرض التصنيفات التقنية المخفية").check();
      for (const [, name] of fixture.granularEquipment) {
        await expect(workspace.locator(".taxonomy-list").first().getByText(name, { exact: true })).toBeVisible();
      }
    });

    test("Add Record equipment selectors expose every audited granular item", async ({ page }) => {
      await page.getByRole("button", { name: "إضافة سجل" }).click();
      await page.getByRole("button", { name: /بطاقة منتج رئيسية/ }).click();
      const familySelect = page.getByLabel("العائلة الرئيسية للمعدات");
      const childSelect = page.getByLabel("التصنيف الفرعي").first();
      const seen = new Set<string>();
      for (const option of await familySelect.locator("option").evaluateAll((nodes) => nodes.slice(1).map((node) => ({ value: (node as HTMLOptionElement).value, text: (node.textContent || "").trim() })))) {
        await familySelect.selectOption(option.value);
        for (const text of (await optionTexts(childSelect)).slice(1)) seen.add(text);
      }
      expect([...seen].sort()).toEqual(fixture.granularEquipment.map(([, name]) => name).sort());
    });

    for (const tabName of ["بطاقات المنتجات الرئيسية", "الجهات والبائعون ومنتجاتهم"]) {
      test(`Media Workspace ${tabName} exposes every audited granular item`, async ({ page }) => {
        await page.getByRole("button", { name: "الصور والملفات" }).click();
        const media = page.locator("#operations-media");
        await expect(media).toBeVisible();
        await media.getByRole("button", { name: tabName }).click();
        const root = media.getByLabel("قسم المنصة");
        await root.selectOption({ label: "المعدات" });
        const family = media.getByLabel("العائلة الرئيسية");
        const child = media.getByLabel("التصنيف الفرعي");
        const seen = new Set<string>();
        for (const value of await family.locator("option").evaluateAll((nodes) => nodes.slice(1).map((node) => (node as HTMLOptionElement).value))) {
          await family.selectOption(value);
          for (const text of (await optionTexts(child)).slice(1)) seen.add(text);
        }
        expect([...seen].sort()).toEqual(fixture.granularEquipment.map(([, name]) => name).sort());
      });
    }
  });
});

import { defineConfig } from "playwright/test";

const extraHTTPHeaders: Record<string, string> = {};
if (process.env.SITES_BYPASS_TOKEN) {
  extraHTTPHeaders["OAI-Sites-Authorization"] = `Bearer ${process.env.SITES_BYPASS_TOKEN}`;
}

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  reporter: "line",
  use: {
    baseURL: process.env.STAGING_BASE_URL || "https://coffee-platform-v1-private.skids0409.chatgpt.site",
    extraHTTPHeaders,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
});

import { defineConfig } from "@playwright/test";

const externalBaseUrl = process.env.PLAYWRIGHT_BASE_URL?.trim();
const localBaseUrl = "http://127.0.0.1:3100";

export default defineConfig({
  testDir: "./e2e",
  timeout: 35_000,
  expect: { timeout: 8_000 },
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "line" : "list",
  use: {
    baseURL: externalBaseUrl || localBaseUrl,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: externalBaseUrl
    ? undefined
    : {
        command: "npm run dev -- --hostname 127.0.0.1 --port 3100",
        url: `${localBaseUrl}/api/health`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});

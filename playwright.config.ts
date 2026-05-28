import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  retries: 0,
  use: {
    baseURL: "http://localhost:3000",
    headless: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "setup",
      testMatch: /global-setup\.ts/,
    },
    {
      name: "dashboard",
      testMatch: /dashboard\.spec\.ts/,
      dependencies: ["setup"],
      use: {
        storageState: "./tests/e2e/.auth/session.json",
      },
    },
    {
      name: "sales-agent",
      testMatch: /sales-agent\.spec\.ts/,
      dependencies: ["setup"],
      use: {
        storageState: "./tests/e2e/.auth/session.json",
      },
    },
  ],
  webServer: {
    command: "npx next dev --port 3000",
    port: 3000,
    reuseExistingServer: true,
    timeout: 30_000,
  },
});

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 2,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:3310",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
      : {},
  },
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile-chromium",
      use: { ...devices["Pixel 7"] },
    },
  ],
  webServer: [
    {
      command: "node tests/support/api-server.mjs",
      url: "http://127.0.0.1:3311/health",
      reuseExistingServer: false,
    },
    {
      command: "npm run start -- --hostname 127.0.0.1 --port 3310",
      env: { API_BASE_URL: "http://127.0.0.1:3311" },
      url: "http://127.0.0.1:3310",
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});

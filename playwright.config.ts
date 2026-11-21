import { defineConfig, devices } from "@playwright/test";

// E2E contra la app real (front + api). E2E_TARGET elige el ambiente:
//   local   → http://edutimetable.local.test (el compose de edutimetable-api)
//   staging → https://staging.edutimetable.82-25-93-70.sslip.io (con basic-auth)
// Las credenciales salen de .env.e2e (ver .env.e2e.example), nunca del código.
// Se corre en Docker con scripts/e2e.sh (npm run e2e / e2e:staging / e2e:ui).
const target = process.env.E2E_TARGET === "staging" ? "staging" : "local";

const baseURLs = {
  local: "http://edutimetable.local.test",
  staging: "https://staging.edutimetable.82-25-93-70.sslip.io",
};

const httpCredentials =
  target === "staging" && process.env.E2E_BASIC_AUTH_USER
    ? { username: process.env.E2E_BASIC_AUTH_USER, password: process.env.E2E_BASIC_AUTH_PASS ?? "" }
    : undefined;

export const authFile = `e2e/.auth/${target}.json`;

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./test-results",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: target === "staging" ? 1 : 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? baseURLs[target],
    httpCredentials,
    locale: "es-AR",
    timezoneId: "America/Argentina/Buenos_Aires",
    // Solo en falla: trace (abrir con `npx playwright show-trace`), screenshot y video
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /.*\.setup\.ts/ },
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], storageState: authFile },
      dependencies: ["setup"],
    },
    {
      name: "mobile",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 375, height: 812 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
        storageState: authFile,
      },
      dependencies: ["setup"],
    },
  ],
});

/**
 * Playwright Project: Cascading Service Failure (5xx / 503 Errors)
 * Issue: Server-side failures causing broken user flows across multiple services
 *
 * Real-world scenario: An infrastructure event (bad deploy, OOM crash, or
 * downstream dependency failure) causes service endpoints to return 500/503
 * errors. As errors accumulate, dependent services also fail — a cascade:
 *   DB fails → orders/cart fail → auth session checks fail → users get errors.
 *
 * Timeline:
 *   0–30s   : Baseline — all services healthy
 *   30s–90s : DB service starts returning 503 intermittently (8% error rate)
 *   90s–2m  : DB error rate climbs to 20%, orders/cart start failing
 *   2m–3m   : Peak cascade — order-service, auth, and analytics all 5xx (30%+)
 *   3m–4m   : Partial recovery — DB errors drop but auth still failing (10%)
 *   4m–5m   : Full recovery — error rates return near zero
 */

const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30_000,
  retries: 0,
  workers: 3,

  use: {
    baseURL: process.env.BASE_URL || 'https://load-testing-sut.pages.dev',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'off',
    actionTimeout: 25_000,
    navigationTimeout: 30_000,
    ignoreHTTPSErrors: true,
  },

  projects: [
    {
      name: 'cascade-failure-chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  reporter: [
    ['list'],
    ['json', { outputFile: 'results/cascade-failure-results.json' }],
  ],
});

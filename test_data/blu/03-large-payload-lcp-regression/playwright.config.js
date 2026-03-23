/**
 * Playwright Project: Large Payload / LCP Regression
 * Issue: Oversized API responses and heavy page assets degrading page load
 *        performance — specifically Largest Contentful Paint (LCP) and rendering.
 *
 * Real-world scenario: A new feature ships containing unoptimized API responses
 * (large JSON with embedded data), multiple large images, and un-paginated
 * lists. This causes LCP to spike above the "poor" threshold (4000ms), users
 * experience slow-feeling pages, and bandwidth-constrained users see timeouts.
 *
 * Timeline:
 *   0–30s   : Baseline — normal payload sizes (1–5KB responses)
 *   30s–90s : Progressive payload growth (20KB → 200KB) as feature rolls out
 *   90s–3m  : Peak bloat — 500KB–1MB responses, LCP severely impacted
 *   3m–4m   : Partial fix deployed — payloads reduced to 100KB
 *   4m+     : Recovery to 10KB responses, LCP returns to acceptable range
 */

const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 90_000,          // Large payloads need more time
  retries: 0,
  workers: 2,               // Fewer workers — network bandwidth matters here

  use: {
    baseURL: process.env.BASE_URL || 'https://load-testing-sut.pages.dev',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'off',
    actionTimeout: 60_000,
    navigationTimeout: 90_000,
    ignoreHTTPSErrors: true,
  },

  projects: [
    {
      name: 'large-payload-chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'large-payload-mobile',
      use: { ...devices['Pixel 5'] },  // Mobile is more sensitive to large payloads
    },
  ],

  reporter: [
    ['list'],
    ['json', { outputFile: 'results/large-payload-results.json' }],
  ],
});

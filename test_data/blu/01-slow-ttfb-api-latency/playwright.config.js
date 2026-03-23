/**
 * Playwright Project: Slow TTFB / API Latency
 * Issue: Backend latency causing high Time To First Byte and degraded page rendering
 *
 * Real-world scenario: A database query bottleneck slows all API responses.
 * Users experience sluggish pages, high TTFB, delayed content rendering,
 * and eventual request timeouts — a classic backend performance degradation.
 *
 * Timeline:
 *   0–30s   : Baseline — fast responses (<200ms)
 *   30s–90s : Gradual degradation — latency rising 200ms→3000ms
 *   90s–3m  : Critical — API latency 3000ms–8000ms, TTFB severely impacted
 *   3m–4m   : Peak — latency at 10000ms–15000ms, timeouts occurring
 *   4m–5m   : Recovery — latency dropping back toward 500ms
 */

const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 60_000,          // Per-test timeout (increased for slow latency scenarios)
  retries: 0,               // No retries — we want to capture real failure signals
  workers: 3,               // Simulate 3 concurrent users

  use: {
    baseURL: process.env.BASE_URL || 'https://load-testing-sut.pages.dev',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'off',
    actionTimeout: 45_000,
    navigationTimeout: 60_000,
    ignoreHTTPSErrors: true,
  },

  projects: [
    {
      name: 'slow-ttfb-chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  reporter: [
    ['list'],
    ['json', { outputFile: 'results/slow-ttfb-results.json' }],
  ],
});

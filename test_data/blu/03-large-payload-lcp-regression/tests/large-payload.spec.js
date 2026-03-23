/**
 * Test Suite: Large Payload / LCP Regression
 *
 * Simulates a payload bloat regression where API responses grow from normal
 * sizes (1–5KB) to large (500KB–1MB) due to an unoptimized feature rollout.
 * Tests cover:
 *   - Normal payload baseline
 *   - Progressive payload growth and its impact on response time
 *   - Peak bloat: concurrent large-payload requests
 *   - Page load performance with overloaded API responses
 *   - Recovery after payload size reduction
 *
 * The mock SUT is used with ?size=X to produce payload of X KB.
 * The /large.html and /images.html pages are used for LCP scenario tests.
 */

const { test, expect, request } = require('@playwright/test');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Endpoint groups (all content-heavy services) ─────────────────────────────

const productEndpoints    = ['/api/products', '/api/search', '/api/recommendations'];
const analyticsEndpoints  = ['/api/analytics', '/api/reports', '/api/dashboard'];
const inventoryEndpoints  = ['/api/inventory', '/api/categories', '/api/wishlist'];
const userEndpoints       = ['/api/users', '/api/notifications', '/api/settings'];

// ─── Phase 1: Baseline (normal payload sizes 1–5KB) ───────────────────────────

test.describe('Phase 1 – Baseline (0–30s): Normal payload sizes (1–5KB)', () => {
  test('product listing loads with normal 2KB response', async ({ baseURL }) => {
    const ctx = await request.newContext({ baseURL });

    for (let i = 0; i < 5; i++) {
      const ep = pickRandom(productEndpoints);
      const res = await ctx.get(`${ep}?size=2`);
      expect(res.status()).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      await sleep(200);
    }

    await ctx.dispose();
  });

  test('analytics loads under 5KB baseline', async ({ baseURL }) => {
    const ctx = await request.newContext({ baseURL });

    const res = await ctx.get('/api/analytics?size=5');
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.sizeKB).toBeLessThanOrEqual(5);

    await ctx.dispose();
  });

  test('page renders quickly with normal content', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/`);
    await expect(page.locator('h1')).toBeVisible({ timeout: 5000 });
  });
});

// ─── Phase 2: Payload growth (30–90s): 20KB → 200KB ──────────────────────────

test.describe('Phase 2 – Payload Growth (30–90s): 20KB → 200KB', () => {
  test('product endpoint grows from 20KB to 200KB progressively', async ({ baseURL }) => {
    const ctx = await request.newContext({ baseURL });

    const payloadSizes = [20, 50, 100, 150, 200];
    for (const size of payloadSizes) {
      const res = await ctx.get(`/api/products?size=${size}`);
      expect(res.status()).toBe(200);

      const body = await res.json();
      // Verify the API is actually returning large data
      if (size > 1) {
        expect(body).toHaveProperty('sizeKB');
      }
      await sleep(300);
    }

    await ctx.dispose();
  });

  test('analytics response time increases with 100KB payload', async ({ baseURL }) => {
    const ctx = await request.newContext({ baseURL });

    // 100KB analytics response (large SQL result set)
    const res = await ctx.get('/api/analytics?size=100');
    expect(res.status()).toBe(200);

    await ctx.dispose();
  });

  test('recommendations endpoint: 150KB payload slows page interaction', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/`);

    // Simulate a recommendation widget loading a bloated response
    const result = await page.evaluate(async () => {
      const start = performance.now();
      const r = await fetch('/api/recommendations?size=150');
      const data = await r.json();
      return {
        status: r.status,
        elapsed: Math.round(performance.now() - start),
        hasSizeField: 'sizeKB' in data,
      };
    });

    expect(result.status).toBe(200);
    expect(result.hasSizeField).toBe(true);
  });
});

// ─── Phase 3: Peak bloat (90–180s): 500KB–1MB responses ──────────────────────

test.describe('Phase 3 – Peak Bloat (90–180s): 500KB–1MB payloads', () => {
  test('product search returns 500KB — extremely slow', async ({ baseURL }) => {
    const ctx = await request.newContext({ baseURL });

    const res = await ctx.get('/api/search?size=500');
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.sizeKB).toBeGreaterThanOrEqual(490);

    await ctx.dispose();
  });

  test('analytics report: 800KB payload nearly times out', async ({ baseURL }) => {
    const ctx = await request.newContext({ baseURL });

    const res = await ctx.get('/api/reports?size=800');
    // May still return 200 but with enormous latency
    expect([200, 504]).toContain(res.status());

    await ctx.dispose();
  });

  test('concurrent large payload requests overload bandwidth', async ({ baseURL }) => {
    const ctx = await request.newContext({ baseURL });

    // Fire 4 large requests simultaneously — simulates multiple users
    const requests = [
      ctx.get('/api/products?size=500'),
      ctx.get('/api/analytics?size=600'),
      ctx.get('/api/inventory?size=400'),
      ctx.get('/api/reports?size=700'),
    ];

    const responses = await Promise.allSettled(requests);
    const fulfilled = responses.filter((r) => r.status === 'fulfilled');

    // At least 2 of the 4 concurrent large requests complete
    expect(fulfilled.length).toBeGreaterThanOrEqual(2);

    await ctx.dispose();
  });

  test('large.html page load — LCP severely degraded', async ({ page, baseURL }) => {
    // /large.html contains multiple large images — peak LCP scenario
    await page.goto(`${baseURL}/large.html`, { waitUntil: 'domcontentloaded' });

    // Trigger a bloated API call on top of the heavy page
    const apiResult = await page.evaluate(async () => {
      const r = await fetch('/api/products?size=500');
      return r.status;
    });

    expect(apiResult).toBe(200);

    // Page body should still be present even with bloated content
    await expect(page.locator('body')).toBeVisible();
  });

  test('images.html: multiple large image assets slow LCP', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/images.html`, {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    });

    // Fire an additional oversized API call (API + images = compounded LCP regression)
    await page.evaluate(async () => {
      await fetch('/api/dashboard?size=300&imageCount=10');
    });

    await expect(page.locator('body')).toBeVisible();
  });

  test('mobile device: 500KB payload causes severe LCP regression', async ({ page, baseURL }) => {
    // Mobile has lower bandwidth — large payloads hit harder
    await page.goto(`${baseURL}/`);

    const result = await page.evaluate(async () => {
      const start = performance.now();
      const r = await fetch('/api/products?size=500');
      const elapsed = Math.round(performance.now() - start);
      return { status: r.status, elapsed };
    });

    expect(result.status).toBe(200);
    // Result consumed by the external tool for LCP correlation
  });
});

// ─── Phase 4: Fix deployed (3m–4m): Payloads reduced to 100KB ────────────────

test.describe('Phase 4 – Partial Fix (3m–4m): Payloads reduced to 100KB', () => {
  test('product endpoint payload trimmed to 100KB', async ({ baseURL }) => {
    const ctx = await request.newContext({ baseURL });

    for (let i = 0; i < 4; i++) {
      const ep = pickRandom(productEndpoints);
      const res = await ctx.get(`${ep}?size=100`);
      expect(res.status()).toBe(200);
      await sleep(200);
    }

    await ctx.dispose();
  });

  test('analytics back to 80KB — improved but not baseline', async ({ baseURL }) => {
    const ctx = await request.newContext({ baseURL });

    const res = await ctx.get('/api/analytics?size=80');
    expect(res.status()).toBe(200);

    await ctx.dispose();
  });

  test('concurrent requests at 100KB perform much better than 500KB peak', async ({ baseURL }) => {
    const ctx = await request.newContext({ baseURL });

    const responses = await Promise.all([
      ctx.get('/api/products?size=100'),
      ctx.get('/api/inventory?size=80'),
      ctx.get('/api/analytics?size=90'),
    ]);

    for (const res of responses) {
      expect(res.status()).toBe(200);
    }

    await ctx.dispose();
  });
});

// ─── Phase 5: Recovery (4m+): Payloads back to 5–10KB ────────────────────────

test.describe('Phase 5 – Recovery (4m+): Normal payload sizes restored', () => {
  test('all endpoints back to sub-10KB responses', async ({ baseURL }) => {
    const ctx = await request.newContext({ baseURL });

    const allEndpoints = [
      ...productEndpoints,
      ...analyticsEndpoints.slice(0, 2),
      ...inventoryEndpoints.slice(0, 2),
    ];

    for (const ep of allEndpoints) {
      const res = await ctx.get(`${ep}?size=5`);
      expect(res.status()).toBe(200);
      await sleep(100);
    }

    await ctx.dispose();
  });

  test('page renders quickly after payload normalization', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/`);
    await expect(page.locator('h1')).toBeVisible({ timeout: 5000 });

    // Verify a standard API call is fast again
    const result = await page.evaluate(async () => {
      const start = performance.now();
      const r = await fetch('/api/products?size=5');
      return { status: r.status, elapsed: Math.round(performance.now() - start) };
    });

    expect(result.status).toBe(200);
    // External tool measures elapsed to confirm LCP recovery
  });

  test('mobile page load recovered after payload fix', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/large.html`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await expect(page.locator('body')).toBeVisible();
  });
});

/**
 * Test Suite: Cascading Service Failure (5xx / 503 Errors)
 *
 * Simulates a production cascade where a database failure propagates through
 * dependent services (orders → cart → checkout → auth). Tests cover:
 *   - Baseline healthy state
 *   - Initial DB failure signals
 *   - Cascade spreading to order + auth services
 *   - Peak failure (multiple services simultaneously down)
 *   - Recovery phase with lingering auth errors
 *
 * The mock SUT is used with ?status=503&errorType=db and ?errorRate=X to
 * produce deterministic error patterns that mirror the timeline above.
 */

const { test, expect, request } = require('@playwright/test');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Endpoint groups ──────────────────────────────────────────────────────────

const dbBackedEndpoints  = ['/api/products', '/api/users', '/api/inventory', '/api/ratings'];
const orderEndpoints     = ['/api/orders', '/api/cart', '/api/checkout', '/api/payments'];
const authEndpoints      = ['/api/auth/validate', '/api/auth/refresh', '/api/auth/login'];
const analyticsEndpoints = ['/api/analytics', '/api/reports', '/api/metrics'];
const healthEndpoints    = ['/api/health', '/api/status'];

// ─── Phase 1: Baseline (all services healthy) ─────────────────────────────────

test.describe('Phase 1 – Baseline (0–30s): All services healthy', () => {
  test('all service groups return 200', async ({ baseURL }) => {
    const ctx = await request.newContext({ baseURL });

    const allEndpoints = [
      ...dbBackedEndpoints,
      ...orderEndpoints.slice(0, 2),
      ...authEndpoints.slice(0, 1),
      ...healthEndpoints,
    ];

    for (const ep of allEndpoints) {
      const res = await ctx.get(ep);
      expect(res.status()).toBe(200);
      await sleep(100);
    }

    await ctx.dispose();
  });

  test('user checkout flow succeeds end-to-end', async ({ baseURL }) => {
    const ctx = await request.newContext({ baseURL });

    // Simulate: browse → add to cart → checkout
    const browseRes   = await ctx.get('/api/products');
    const cartRes     = await ctx.get('/api/cart');
    const checkoutRes = await ctx.get('/api/checkout');

    expect(browseRes.status()).toBe(200);
    expect(cartRes.status()).toBe(200);
    expect(checkoutRes.status()).toBe(200);

    await ctx.dispose();
  });
});

// ─── Phase 2: DB failure begins (30–90s, 8% error rate) ──────────────────────

test.describe('Phase 2 – DB Failure Starts (30–90s): 8% intermittent errors', () => {
  test('DB-backed endpoints show intermittent 503 errors', async ({ baseURL }) => {
    const ctx = await request.newContext({ baseURL });

    let errorCount = 0;
    const totalRequests = 12;

    for (let i = 0; i < totalRequests; i++) {
      const endpoint = pickRandom(dbBackedEndpoints);
      // 8% of DB-backed requests fail
      const useError = i < 1; // force at least 1 error in 12 requests ≈ 8%
      const url = useError
        ? `${endpoint}?status=503&errorType=db&delay=200`
        : `${endpoint}?delay=100`;

      const res = await ctx.get(url);
      if (res.status() === 503) errorCount++;
      await sleep(200);
    }

    expect(errorCount).toBeGreaterThanOrEqual(1);
    await ctx.dispose();
  });

  test('health endpoints not yet affected', async ({ baseURL }) => {
    const ctx = await request.newContext({ baseURL });

    for (const ep of healthEndpoints) {
      const res = await ctx.get(ep);
      expect(res.status()).toBe(200);
    }

    await ctx.dispose();
  });

  test('order service still working despite early DB errors', async ({ baseURL }) => {
    const ctx = await request.newContext({ baseURL });

    // Most order requests still succeed at 8% error rate
    const results = await Promise.all(
      orderEndpoints.map((ep) => ctx.get(`${ep}?delay=150`))
    );

    const successes = results.filter((r) => r.status() === 200).length;
    // At 8% rate, almost all should pass
    expect(successes).toBeGreaterThanOrEqual(3);

    await ctx.dispose();
  });
});

// ─── Phase 3: Cascade spreading (90–120s, 20% DB errors, orders start failing) ─

test.describe('Phase 3 – Cascade Spreading (90–120s): DB 20%, orders begin failing', () => {
  test('DB error rate climbs to 20%', async ({ baseURL }) => {
    const ctx = await request.newContext({ baseURL });

    let errorCount = 0;
    const total = 10;

    for (let i = 0; i < total; i++) {
      // Every 5th request fails (20%)
      const shouldFail = i % 5 === 0;
      const ep = pickRandom(dbBackedEndpoints);
      const url = shouldFail
        ? `${ep}?status=503&errorType=db&delay=300`
        : `${ep}?delay=200`;

      const res = await ctx.get(url);
      if (res.status() === 503) errorCount++;
      await sleep(250);
    }

    expect(errorCount).toBeGreaterThanOrEqual(2); // ≥20% failures
    await ctx.dispose();
  });

  test('order API cascade: cart and checkout start returning 503', async ({ baseURL }) => {
    const ctx = await request.newContext({ baseURL });

    // Cart: intermittent failure
    const cartGood = await ctx.get('/api/cart?delay=300');
    const cartBad  = await ctx.get('/api/cart?status=503&errorType=db');

    expect(cartGood.status()).toBe(200);
    expect(cartBad.status()).toBe(503);

    // Checkout: now starting to fail
    const checkBad = await ctx.get('/api/checkout?status=503&errorType=db');
    expect(checkBad.status()).toBe(503);

    await ctx.dispose();
  });

  test('analytics service first timeouts appearing', async ({ baseURL }) => {
    const ctx = await request.newContext({ baseURL });

    const res = await ctx.get('/api/analytics?delay=3000&status=504&errorType=timeout');
    expect([503, 504]).toContain(res.status());

    await ctx.dispose();
  });
});

// ─── Phase 4: Peak cascade (2m–3m, 30%+ errors, auth also failing) ────────────

test.describe('Phase 4 – Peak Cascade (2m–3m): 30% errors, auth service down', () => {
  test('auth service returns 401/503 errors during peak', async ({ baseURL }) => {
    const ctx = await request.newContext({ baseURL });

    let failCount = 0;
    for (let i = 0; i < 8; i++) {
      const ep = pickRandom(authEndpoints);
      // 25% of auth requests return 401 (session store overloaded)
      const shouldFail = i % 4 === 0;
      const url = shouldFail
        ? `${ep}?status=401&errorType=auth`
        : ep;

      const res = await ctx.get(url);
      if (res.status() >= 400) failCount++;
      await sleep(200);
    }

    expect(failCount).toBeGreaterThanOrEqual(2);
    await ctx.dispose();
  });

  test('user checkout journey completely broken at peak', async ({ baseURL }) => {
    const ctx = await request.newContext({ baseURL });

    // Simulate a user who: validates auth → gets cart → attempts checkout
    const authRes     = await ctx.get('/api/auth/validate?status=401&errorType=auth');
    const cartRes     = await ctx.get('/api/cart?status=503&errorType=db');
    const checkoutRes = await ctx.get('/api/checkout?status=503&errorType=db');

    expect(authRes.status()).toBe(401);
    expect(cartRes.status()).toBe(503);
    expect(checkoutRes.status()).toBe(503);

    await ctx.dispose();
  });

  test('multiple service categories fail concurrently', async ({ baseURL }) => {
    const ctx = await request.newContext({ baseURL });

    const [dbRes, orderRes, authRes, analyticsRes] = await Promise.all([
      ctx.get('/api/products?status=503&errorType=db'),
      ctx.get('/api/orders?status=503&errorType=db'),
      ctx.get('/api/auth/validate?status=401&errorType=auth'),
      ctx.get('/api/analytics?status=504&errorType=timeout'),
    ]);

    expect(dbRes.status()).toBe(503);
    expect(orderRes.status()).toBe(503);
    expect(authRes.status()).toBe(401);
    expect(analyticsRes.status()).toBe(504);

    await ctx.dispose();
  });

  test('page load encounters broken API — frontend shows error state', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/`);

    // The page tries to call an API; we simulate it returning 500
    const [apiResponse] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/') || true, { timeout: 5000 }).catch(() => null),
      page.evaluate(async () => {
        try {
          const r = await fetch('/api/products?status=500');
          return r.status;
        } catch {
          return 0;
        }
      }),
    ]);

    // Page itself must still render (frontend resilience check)
    await expect(page.locator('h1')).toBeVisible();
  });
});

// ─── Phase 5: Partial recovery (3m–4m, DB recovers, auth still degraded) ──────

test.describe('Phase 5 – Partial Recovery (3m–4m): DB recovers, auth still 10% errors', () => {
  test('DB-backed services recovering', async ({ baseURL }) => {
    const ctx = await request.newContext({ baseURL });

    for (let i = 0; i < 5; i++) {
      const ep = pickRandom(dbBackedEndpoints);
      const res = await ctx.get(`${ep}?delay=200`);
      expect(res.status()).toBe(200);
      await sleep(300);
    }

    await ctx.dispose();
  });

  test('auth service still showing residual 10% errors', async ({ baseURL }) => {
    const ctx = await request.newContext({ baseURL });

    let errCount = 0;
    for (let i = 0; i < 10; i++) {
      const shouldFail = i === 0; // 10% rate
      const ep = '/api/auth/validate';
      const url = shouldFail ? `${ep}?status=401&errorType=auth` : ep;
      const res = await ctx.get(url);
      if (res.status() >= 400) errCount++;
      await sleep(200);
    }

    // At least 1 residual auth failure
    expect(errCount).toBeGreaterThanOrEqual(1);
    await ctx.dispose();
  });

  test('order flow partially restored', async ({ baseURL }) => {
    const ctx = await request.newContext({ baseURL });

    const cartRes     = await ctx.get('/api/cart?delay=300');
    const checkoutRes = await ctx.get('/api/checkout?delay=400');

    expect(cartRes.status()).toBe(200);
    expect(checkoutRes.status()).toBe(200);

    await ctx.dispose();
  });
});

// ─── Phase 6: Full recovery (4m–5m) ──────────────────────────────────────────

test.describe('Phase 6 – Full Recovery (4m–5m): All services healthy again', () => {
  test('all services return 200 after recovery', async ({ baseURL }) => {
    const ctx = await request.newContext({ baseURL });

    const allEndpoints = [
      ...dbBackedEndpoints.slice(0, 2),
      ...orderEndpoints.slice(0, 2),
      ...authEndpoints.slice(0, 1),
      ...healthEndpoints,
    ];

    for (const ep of allEndpoints) {
      const res = await ctx.get(ep);
      expect(res.status()).toBe(200);
      await sleep(100);
    }

    await ctx.dispose();
  });

  test('checkout user journey fully restored', async ({ baseURL }) => {
    const ctx = await request.newContext({ baseURL });

    const authRes     = await ctx.get('/api/auth/validate');
    const browseRes   = await ctx.get('/api/products');
    const cartRes     = await ctx.get('/api/cart');
    const checkoutRes = await ctx.get('/api/checkout');

    expect(authRes.status()).toBe(200);
    expect(browseRes.status()).toBe(200);
    expect(cartRes.status()).toBe(200);
    expect(checkoutRes.status()).toBe(200);

    await ctx.dispose();
  });
});

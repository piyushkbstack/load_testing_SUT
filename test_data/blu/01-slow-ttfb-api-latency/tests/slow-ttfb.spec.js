/**
 * Test Suite: Slow TTFB / API Latency
 *
 * Simulates a backend database bottleneck that progressively degrades API
 * response times. Each phase of the test increases latency to model the
 * real-world pattern of a slow query accumulating in a connection pool.
 *
 * What is measured (by the external tool consuming these tests):
 *   - TTFB per request phase
 *   - Navigation timing (domContentLoaded, loadEventEnd)
 *   - Per-endpoint response time percentiles
 *   - Request success/failure rate across phases
 *
 * Endpoints used (all on the mock SUT with ?delay= to simulate DB latency):
 *   /api/products, /api/users, /api/orders, /api/analytics,
 *   /api/recommendations, /api/cart, /api/health
 */

const { test, expect, request } = require('@playwright/test');

// ─── Timing helpers ──────────────────────────────────────────────────────────

const testStartTime = Date.now();

function elapsedSeconds() {
  return Math.floor((Date.now() - testStartTime) / 1000);
}

/**
 * Returns simulated DB latency (ms) based on how many seconds have elapsed.
 * Mirrors a realistic connection-pool-exhaustion degradation curve.
 */
function getDbLatency(elapsed) {
  const jitter = Math.floor(Math.random() * 300 - 150); // ±150ms noise
  if (elapsed < 30)  return Math.max(0, 50  + jitter);   // Baseline: ~50ms
  if (elapsed < 90)  return Math.max(0, 200 + (elapsed - 30) * 47 + jitter); // 200ms→3000ms
  if (elapsed < 180) return Math.max(0, 3000 + (elapsed - 90) * 56 + jitter); // 3s→8s
  if (elapsed < 240) return Math.max(0, 8000 + (elapsed - 180) * 120 + jitter); // 8s→15s
  if (elapsed < 300) return Math.max(0, 15000 - (elapsed - 240) * 230 + jitter); // 15s→1.2s
  return Math.max(0, 500 + jitter); // Degraded-normal: 500ms
}

// ─── Endpoint groups ─────────────────────────────────────────────────────────

const productEndpoints  = ['/api/products', '/api/search', '/api/categories', '/api/recommendations'];
const userEndpoints     = ['/api/users', '/api/profile', '/api/settings'];
const orderEndpoints    = ['/api/orders', '/api/cart', '/api/checkout'];
const analyticsEndpoints = ['/api/analytics', '/api/metrics', '/api/dashboard'];
const healthEndpoints   = ['/api/health', '/api/status'];

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Phase 1: Baseline (fast responses) ──────────────────────────────────────

test.describe('Phase 1 – Baseline (0–30s): Normal fast responses', () => {
  test('product listing loads quickly', async ({ page, baseURL }) => {
    const apiContext = await request.newContext({ baseURL });

    for (let i = 0; i < 5; i++) {
      const endpoint = pickRandom(productEndpoints);
      const response = await apiContext.get(`${endpoint}?delay=50`);
      expect(response.status()).toBe(200);
      await sleep(200);
    }

    await apiContext.dispose();
  });

  test('user service responds under baseline load', async ({ page, baseURL }) => {
    const apiContext = await request.newContext({ baseURL });

    for (let i = 0; i < 4; i++) {
      const endpoint = pickRandom(userEndpoints);
      const response = await apiContext.get(`${endpoint}?delay=50`);
      expect(response.status()).toBe(200);
      await sleep(300);
    }

    await apiContext.dispose();
  });

  test('health checks pass instantly', async ({ page, baseURL }) => {
    const apiContext = await request.newContext({ baseURL });

    for (const ep of healthEndpoints) {
      const response = await apiContext.get(ep);
      expect(response.status()).toBe(200);
    }

    await apiContext.dispose();
  });
});

// ─── Phase 2: Early degradation (30–90s) ─────────────────────────────────────

test.describe('Phase 2 – Early Degradation (30–90s): Latency rising 200ms→3000ms', () => {
  test('product API: latency climbing, user journey slows', async ({ page, baseURL }) => {
    const apiContext = await request.newContext({ baseURL });

    // Simulate a user browsing products as latency ramps up
    const latencySteps = [200, 500, 1000, 2000, 3000];
    for (const latency of latencySteps) {
      const endpoint = pickRandom(productEndpoints);
      const response = await apiContext.get(`${endpoint}?delay=${latency}`);
      expect(response.status()).toBeLessThan(500);
      await sleep(500);
    }

    await apiContext.dispose();
  });

  test('order API: cart and checkout experience degrading', async ({ page, baseURL }) => {
    const apiContext = await request.newContext({ baseURL });

    const cartRes   = await apiContext.get('/api/cart?delay=800');
    const ordersRes = await apiContext.get('/api/orders?delay=1500');

    expect(cartRes.status()).toBeLessThan(500);
    expect(ordersRes.status()).toBeLessThan(500);

    await apiContext.dispose();
  });

  test('page load impacted: index.html with slow API call', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/`);
    // Trigger an API call that simulates delayed backend (the page calls /api/test)
    await page.evaluate(async () => {
      await fetch('/api/products?delay=2000');
    });
    // Ensure page is still interactive (not hung)
    await expect(page.locator('h1')).toBeVisible();
  });
});

// ─── Phase 3: Critical degradation (90–180s) ─────────────────────────────────

test.describe('Phase 3 – Critical (90–180s): API latency 3000ms–8000ms', () => {
  test('analytics endpoint extremely slow — timeout risk', async ({ page, baseURL }) => {
    const apiContext = await request.newContext({ baseURL });

    // Analytics endpoints run heavy aggregation queries — hit hardest
    const response = await apiContext.get('/api/analytics?delay=6000');
    // Should still respond (not timeout) but with severe latency
    expect([200, 503, 504]).toContain(response.status());

    await apiContext.dispose();
  });

  test('product search under severe latency', async ({ page, baseURL }) => {
    const apiContext = await request.newContext({ baseURL });

    const endpoints = [
      '/api/search?delay=4000',
      '/api/categories?delay=4500',
      '/api/recommendations?delay=5000',
    ];

    for (const ep of endpoints) {
      const response = await apiContext.get(ep);
      expect(response.status()).toBeLessThan(600);
      await sleep(300);
    }

    await apiContext.dispose();
  });

  test('concurrent user sessions during critical latency', async ({ page, baseURL }) => {
    const apiContext = await request.newContext({ baseURL });

    // Fire 6 concurrent requests to simulate multiple users hitting slow backend
    const requests = [
      '/api/products?delay=3000',
      '/api/users?delay=3500',
      '/api/orders?delay=4000',
      '/api/cart?delay=3200',
      '/api/dashboard?delay=5000',
      '/api/search?delay=3800',
    ].map((ep) => apiContext.get(ep));

    const responses = await Promise.allSettled(requests);
    const fulfilled = responses.filter((r) => r.status === 'fulfilled');

    // At least 50% of concurrent requests should not hard-crash
    expect(fulfilled.length).toBeGreaterThanOrEqual(3);

    await apiContext.dispose();
  });
});

// ─── Phase 4: Peak incident (180–240s) ───────────────────────────────────────

test.describe('Phase 4 – Peak Incident (3m–4m): 10000ms–15000ms latency, timeouts', () => {
  test('checkout flow fails — user cannot complete purchase', async ({ page, baseURL }) => {
    const apiContext = await request.newContext({ baseURL });

    // Cart: still (barely) reachable
    const cartRes = await apiContext.get('/api/cart?delay=10000');
    // Checkout: likely to timeout or return 504
    const checkoutRes = await apiContext.get('/api/checkout?delay=15000&status=504&errorType=timeout');

    expect([200, 503, 504]).toContain(cartRes.status());
    expect([504, 503]).toContain(checkoutRes.status());

    await apiContext.dispose();
  });

  test('health endpoint stays responsive while app endpoints timeout', async ({ page, baseURL }) => {
    const apiContext = await request.newContext({ baseURL });

    // Health should always respond fast (it bypasses DB)
    const healthRes = await apiContext.get('/api/health');
    expect(healthRes.status()).toBe(200);

    // Meanwhile, an app endpoint is at peak latency
    const appRes = await apiContext.get('/api/products?delay=14000&status=503&errorType=db');
    expect([503, 504]).toContain(appRes.status());

    await apiContext.dispose();
  });

  test('database error messages visible at peak — DB connection pool exhausted', async ({ page, baseURL }) => {
    const apiContext = await request.newContext({ baseURL });

    const response = await apiContext.get('/api/orders?status=503&errorType=db&delay=12000');
    expect(response.status()).toBe(503);

    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toMatch(/database/i);

    await apiContext.dispose();
  });
});

// ─── Phase 5: Recovery (240–300s) ────────────────────────────────────────────

test.describe('Phase 5 – Recovery (4m–5m): Latency dropping, partial restoration', () => {
  test('product API recovering — latency dropping to 1500ms', async ({ page, baseURL }) => {
    const apiContext = await request.newContext({ baseURL });

    for (let i = 0; i < 4; i++) {
      const endpoint = pickRandom(productEndpoints);
      const response = await apiContext.get(`${endpoint}?delay=1500`);
      expect(response.status()).toBe(200);
      await sleep(400);
    }

    await apiContext.dispose();
  });

  test('health check confirms partial recovery', async ({ page, baseURL }) => {
    const apiContext = await request.newContext({ baseURL });

    for (const ep of healthEndpoints) {
      const response = await apiContext.get(ep);
      expect(response.status()).toBe(200);
    }

    // App endpoints still slightly elevated but not critical
    const appRes = await apiContext.get('/api/users?delay=500');
    expect(appRes.status()).toBe(200);

    await apiContext.dispose();
  });
});

/**
 * K6 Test: Realistic Production Incident Simulation
 * Purpose: Simulate a realistic cascading failure scenario with multiple issues
 * Scenario: Database overload leads to cascading failures across services
 * 
 * Timeline:
 * 0-30s: Normal operations (ramp up phase - load increasing)
 * 30s-1m: Database starts slowing down (gradual latency increase)
 * 1m-2m: Auth service starts failing intermittently (cache invalidation issue)
 * 2m-3m: Database connection pool exhaustion, more 500 errors
 * 3m-4m: Peak failure - multiple services affected, large payloads timing out
 * 4m-5m: Recovery begins - some services stabilize
 * 5m+: Gradual return to normal (ramp down phase)
 * 
 * Real-World Behaviors:
 * - Retry logic for failed requests
 * - Variable think time between users
 * - User abandonment after multiple errors
 * - Session correlation with auth tokens
 * - Mix of GET/POST/PUT requests
 * - Client-side timeouts for slow requests
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Counter, Rate } from 'k6/metrics';

const responseTime = new Trend('response_time');
const authErrors = new Counter('auth_errors');
const dbErrors = new Counter('database_errors');
const serverErrors = new Counter('server_errors');
const slowRequests = new Counter('slow_requests');
const errorRate = new Rate('error_rate');
const retriedRequests = new Counter('retried_requests');
const abandonedSessions = new Counter('abandoned_sessions');
const timeoutRequests = new Counter('timeout_requests');

const BASE_URL = __ENV.BASE_URL || 'https://load-testing-sut.pages.dev';
const testStartTime = Date.now();
const CLIENT_TIMEOUT = 30000; // 30s client-side timeout

// Realistic API endpoints grouped by service
const userServiceEndpoints = ['/api/users', '/api/profile', '/api/settings', '/api/notifications'];
const authEndpoints = ['/api/auth/login', '/api/auth/validate', '/api/auth/refresh'];
const productEndpoints = ['/api/products', '/api/search', '/api/categories', '/api/recommendations'];
const orderEndpoints = ['/api/orders', '/api/cart', '/api/checkout', '/api/payments'];
const analyticsEndpoints = ['/api/analytics', '/api/metrics', '/api/dashboard', '/api/reports'];
const healthEndpoints = ['/api/health', '/api/status'];

export const options = {
  vus: 10,
  duration: '7m',
  thresholds: {
    http_req_failed: ['rate<0.3'], // Allow up to 30% failure during peak incident
    http_req_duration: ['p(95)<10000'], // 95% under 10s
  },
};

function getElapsedSeconds() {
  return Math.floor((Date.now() - testStartTime) / 1000);
}

function pickRandom(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// Variable think time - realistic user behavior (not all users same speed)
function getThinkTime() {
  // Random think time between 0.5s and 2s, with some outliers
  const random = Math.random();
  if (random < 0.1) return Math.random() * 5; // 10% slow users (0-5s)
  if (random < 0.2) return Math.random() * 0.3; // 10% very fast users (0-0.3s)
  return 0.5 + Math.random() * 1.5; // 80% normal users (0.5-2s)
}

// Retry logic for failed requests (exponential backoff)
function makeRequestWithRetry(url, maxRetries = 2) {
  let attempt = 0;
  let lastResponse;
  
  while (attempt <= maxRetries) {
    const startTime = Date.now();
    const res = http.get(url, { timeout: `${CLIENT_TIMEOUT}ms` });
    const duration = Date.now() - startTime;
    
    responseTime.add(duration);
    lastResponse = res;
    
    // Check if request timed out (client-side)
    if (duration >= CLIENT_TIMEOUT) {
      timeoutRequests.add(1);
      break; // Don't retry timeouts
    }
    
    // Retry on 5xx errors or 429 (rate limit)
    if (res.status >= 500 || res.status === 429) {
      attempt++;
      if (attempt <= maxRetries) {
        retriedRequests.add(1);
        // Exponential backoff: 100ms, 200ms, 400ms
        const backoff = 100 * Math.pow(2, attempt - 1);
        sleep(backoff / 1000);
        continue;
      }
    }
    
    break; // Success or non-retryable error
  }
  
  return lastResponse;
}

// Simulate database query latency based on time (with some noise)
function getDatabaseLatency(elapsed) {
  const noise = Math.random() * 500 - 250; // ±250ms random noise
  
  if (elapsed < 30) return Math.max(0, 0 + noise); // Phase 1: Normal
  if (elapsed < 60) return Math.max(0, Math.floor(2000 + (elapsed - 30) * 100) + noise); // Phase 2: 2s-5s
  if (elapsed < 120) return Math.max(0, Math.floor(4000 + (elapsed - 60) * 80) + noise); // Phase 3: 4s-8.8s
  if (elapsed < 180) return Math.max(0, Math.floor(7000 + (elapsed - 120) * 100) + noise); // Phase 4: 7s-13s
  if (elapsed < 240) return Math.max(0, 15000 + noise); // Phase 5: Peak at 15s
  if (elapsed < 300) return Math.max(0, Math.floor(15000 - (elapsed - 240) * 200) + noise); // Phase 6: 15s-3s
  return Math.max(0, 500 + noise); // Phase 7: Normal with slight latency
}

// Auth failure rate based on time (cache invalidation issue)
function getAuthFailureRate(elapsed) {
  if (elapsed < 60) return 0;
  if (elapsed < 120) return 0.05; // 5% auth failures
  if (elapsed < 180) return 0.15; // 15% auth failures
  if (elapsed < 240) return 0.25; // 25% auth failures (peak)
  if (elapsed < 300) return 0.10; // 10% auth failures (recovering)
  return 0.02; // 2% residual failures
}

// Database error rate
function getDbErrorRate(elapsed) {
  if (elapsed < 120) return 0;
  if (elapsed < 180) return 0.08; // 8% DB errors
  if (elapsed < 240) return 0.20; // 20% DB errors (peak)
  if (elapsed < 300) return 0.10; // 10% DB errors
  return 0; // Recovered
}

// General server error rate
function getServerErrorRate(elapsed) {
  if (elapsed < 180) return 0;
  if (elapsed < 240) return 0.12; // 12% server errors
  if (elapsed < 300) return 0.05; // 5% server errors
  return 0; // Recovered
}

export default function () {
  const elapsed = getElapsedSeconds();
  let consecutiveErrors = 0; // Track errors for abandonment logic
  const maxConsecutiveErrors = 3; // Abandon after 3 consecutive errors
  
  // Simulate user session with auth token (realistic correlation)
  const sessionId = `session_${__VU}_${__ITER}`;
  const userId = Math.floor(Math.random() * 10000);
  
  // ============ Session Start: Auth Token Validation ============
  const authEndpoint = pickRandom(authEndpoints);
  const hasAuthIssue = Math.random() < getAuthFailureRate(elapsed);
  
  const authUrl = hasAuthIssue
    ? `${BASE_URL}${authEndpoint}?status=401&errorType=auth`
    : `${BASE_URL}${authEndpoint}?sessionId=${sessionId}`;
  
  let authRes = makeRequestWithRetry(authUrl, 1); // Retry auth once
  
  if (authRes.status === 401) {
    authErrors.add(1);
    errorRate.add(1);
    consecutiveErrors++;
    
    // User abandons if auth fails
    if (consecutiveErrors >= 2) {
      abandonedSessions.add(1);
      sleep(getThinkTime());
      return; // Exit - user gives up
    }
  } else {
    errorRate.add(0);
    consecutiveErrors = 0;
  }
  
  sleep(getThinkTime() * 0.5); // Short think time after auth
  
  // ============ User Service Calls (Profile, Settings) ============
  for (let i = 0; i < 2; i++) {
    const endpoint = pickRandom(userServiceEndpoints);
    
    const hasAuthIssue = Math.random() < getAuthFailureRate(elapsed);
    const url = hasAuthIssue 
      ? `${BASE_URL}${endpoint}?userId=${userId}&status=401&errorType=auth`
      : `${BASE_URL}${endpoint}?userId=${userId}&sessionId=${sessionId}`;
    
    const res = makeRequestWithRetry(url);
    
    if (res.status === 401) {
      authErrors.add(1);
      errorRate.add(1);
      consecutiveErrors++;
    } else {
      errorRate.add(0);
      consecutiveErrors = Math.max(0, consecutiveErrors - 1); // Recover from errors
    }
    
    check(res, {
      'user service status ok': (r) => r.status < 500,
    });
    
    // User abandons after multiple consecutive errors
    if (consecutiveErrors >= maxConsecutiveErrors) {
      abandonedSessions.add(1);
      sleep(getThinkTime());
      return;
    }
    
    sleep(getThinkTime() * 0.3);
  }
  
  // ============ Product Search and Browse (Main User Activity) ============
  const searchIterations = Math.floor(Math.random() * 3) + 2; // 2-4 searches
  for (let i = 0; i < searchIterations; i++) {
    const endpoint = pickRandom(productEndpoints);
    const searchTerms = ['laptop', 'phone', 'shoes', 'watch', 'headphones', 'tablet', 'camera', 'desk'];
    const term = pickRandom(searchTerms);
    
    // Database-backed queries get latency
    const dbLatency = getDatabaseLatency(elapsed);
    const hasDbError = Math.random() < getDbErrorRate(elapsed);
    
    let url;
    if (hasDbError) {
      url = `${BASE_URL}${endpoint}?q=${term}&status=503&errorType=db`;
    } else if (dbLatency > 1000) {
      url = `${BASE_URL}${endpoint}?q=${term}&delay=${dbLatency}`;
      slowRequests.add(1);
    } else {
      url = `${BASE_URL}${endpoint}?q=${term}`;
    }
    
    const res = makeRequestWithRetry(url);
    
    if (res.status === 503) {
      dbErrors.add(1);
      errorRate.add(1);
      consecutiveErrors++;
    } else if (res.status >= 500) {
      serverErrors.add(1);
      errorRate.add(1);
      consecutiveErrors++;
    } else {
      errorRate.add(0);
      consecutiveErrors = Math.max(0, consecutiveErrors - 1);
    }
    
    check(res, {
      'product service available': (r) => r.status < 500 || r.status === 503,
    });
    
    // User abandons if search keeps failing
    if (consecutiveErrors >= maxConsecutiveErrors) {
      abandonedSessions.add(1);
      sleep(getThinkTime());
      return;
    }
    
    sleep(getThinkTime() * 0.4);
  }
  
  // ============ Batch Product Details (Realistic User Browsing) ============
  const productIds = [101, 234, 567, 892, 1043];
  const browsedProducts = productIds.slice(0, Math.floor(Math.random() * 3) + 1);
  
  browsedProducts.forEach(id => {
    const dbLatency = getDatabaseLatency(elapsed);
    const url = dbLatency > 1000
      ? `${BASE_URL}/api/products/${id}?delay=${dbLatency}`
      : `${BASE_URL}/api/products/${id}`;
    
    const res = makeRequestWithRetry(url);
    
    if (res.status >= 500) {
      consecutiveErrors++;
    } else {
      consecutiveErrors = Math.max(0, consecutiveErrors - 1);
    }
    
    sleep(getThinkTime() * 0.2);
  });
  
  // ============ Add to Cart (POST Request - 60% of users) ============
  if (Math.random() < 0.6 && consecutiveErrors < maxConsecutiveErrors) {
    const productId = pickRandom(browsedProducts);
    const dbLatency = getDatabaseLatency(elapsed);
    const hasServerError = Math.random() < getServerErrorRate(elapsed);
    
    let cartUrl;
    if (hasServerError) {
      cartUrl = `${BASE_URL}/api/cart/add?status=500`;
    } else if (dbLatency > 1000) {
      cartUrl = `${BASE_URL}/api/cart/add?productId=${productId}&delay=${dbLatency}`;
    } else {
      cartUrl = `${BASE_URL}/api/cart/add?productId=${productId}&userId=${userId}`;
    }
    
    // POST request with retry
    const cartRes = makeRequestWithRetry(cartUrl);
    
    if (cartRes.status >= 500) {
      serverErrors.add(1);
      errorRate.add(1);
      consecutiveErrors++;
    } else {
      errorRate.add(0);
      consecutiveErrors = Math.max(0, consecutiveErrors - 1);
    }
    
    check(cartRes, {
      'cart add successful': (r) => r.status < 400,
    });
    
    sleep(getThinkTime());
  }
  
  // ============ Order Processing (POST/PUT - 30% of users who added to cart) ============
  if (Math.random() < 0.3 && consecutiveErrors < maxConsecutiveErrors) {
    const orderId = Math.floor(Math.random() * 50000);
    const dbLatency = getDatabaseLatency(elapsed);
    const hasServerError = Math.random() < getServerErrorRate(elapsed);
    
    // Create order (POST)
    let orderUrl;
    if (hasServerError) {
      orderUrl = `${BASE_URL}/api/orders/create?status=500`;
    } else if (dbLatency > 1000) {
      orderUrl = `${BASE_URL}/api/orders/create?userId=${userId}&delay=${dbLatency}`;
    } else {
      orderUrl = `${BASE_URL}/api/orders/create?userId=${userId}`;
    }
    
    const orderRes = makeRequestWithRetry(orderUrl, 3); // Retry orders up to 3 times
    
    if (orderRes.status >= 500) {
      serverErrors.add(1);
      errorRate.add(1);
      consecutiveErrors++;
    } else if (orderRes.status === 503) {
      dbErrors.add(1);
      errorRate.add(1);
      consecutiveErrors++;
    } else {
      errorRate.add(0);
      consecutiveErrors = 0; // Reset on successful order
    }
    
    check(orderRes, {
      'order created or retryable': (r) => r.status < 400 || r.status === 503,
    });
    
    // Payment processing (if order succeeded)
    if (orderRes.status < 300) {
      sleep(getThinkTime() * 0.5);
      
      const paymentUrl = `${BASE_URL}/api/payments/process?orderId=${orderId}&userId=${userId}`;
      const paymentRes = makeRequestWithRetry(paymentUrl, 2);
      
      check(paymentRes, {
        'payment processed': (r) => r.status < 400,
      });
    }
    
    sleep(getThinkTime());
  }
  
  // ============ Analytics/Reports (Heavy Queries - 20% of users) ============
  if (Math.random() < 0.2 && consecutiveErrors < maxConsecutiveErrors) {
    const analyticsEndpoint = pickRandom(analyticsEndpoints);
    
    // Analytics queries are heavy and affected by DB issues
    const dbLatency = Math.floor(getDatabaseLatency(elapsed) * 1.3); // 30% slower
    const hasDbError = Math.random() < getDbErrorRate(elapsed) * 1.5; // 50% more likely to fail
    const isLargePayload = elapsed > 120; // Large payloads during stress
    
    let analyticsUrl;
    if (hasDbError) {
      analyticsUrl = `${BASE_URL}${analyticsEndpoint}?status=503&errorType=db`;
    } else if (dbLatency > 1000) {
      const sizeParam = isLargePayload ? '&size=300' : '';
      analyticsUrl = `${BASE_URL}${analyticsEndpoint}?userId=${userId}&delay=${dbLatency}${sizeParam}`;
      slowRequests.add(1);
    } else {
      analyticsUrl = `${BASE_URL}${analyticsEndpoint}?userId=${userId}`;
    }
    
    const analyticsRes = makeRequestWithRetry(analyticsUrl, 1); // Analytics only retry once
    
    if (analyticsRes.status === 503) {
      dbErrors.add(1);
      errorRate.add(1);
      consecutiveErrors++;
    } else if (analyticsRes.status >= 500) {
      serverErrors.add(1);
      errorRate.add(1);
      consecutiveErrors++;
    } else {
      errorRate.add(0);
    }
    
    check(analyticsRes, {
      'analytics service responding': (r) => r.status < 500 || r.status === 503,
    });
    
    sleep(getThinkTime() * 1.5); // Longer think time for analytics
  }
  
  // ============ Health Checks (Background Monitoring - 5% chance) ============
  if (Math.random() < 0.05) {
    const healthEndpoint = pickRandom(healthEndpoints);
    http.get(`${BASE_URL}${healthEndpoint}`);
    sleep(getThinkTime() * 0.1);
  }
  
  // ============ Background API Calls (Simulated Widgets/Polls) ============
  const miscEndpoints = [
    '/api/wishlist/count',
    '/api/cart/total',
    '/api/reviews/recent',
    '/api/inventory/check',
  ];
  
  const miscEndpoint = pickRandom(miscEndpoints);
  http.get(`${BASE_URL}${miscEndpoint}?userId=${userId}`);
  
  // Variable final sleep - realistic user behavior
  sleep(getThinkTime());
}

/**
 * K6 Test: Backend Latency Simulation (Hidden in Volume)
 * Purpose: Simulate slow database queries hidden in normal traffic
 * Expected: Mostly 200 responses, some with backend delay
 * RCA Signal: Backend performance degradation (10% of requests)
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Counter } from 'k6/metrics';

const responseTime = new Trend('response_time');
const slowRequests = new Counter('slow_requests');

const BASE_URL = __ENV.BASE_URL || 'https://load-testing-sut.pages.dev';

// Delay progression: gradual increase every 10 seconds
const DELAY_VALUES = [3000, 3800, 4700, 5900, 7200, 8800, 10500, 12400, 14300, 15000];
const testStartTime = Date.now();

// Simulate various API endpoints
const endpoints = [
  '/api/users',
  '/api/products',
  '/api/orders',
  '/api/inventory',
  '/api/search',
  '/api/categories',
  '/api/recommendations',
  '/api/cart',
  '/api/wishlist',
  '/api/reviews',
  '/api/ratings',
  '/api/notifications',
  '/api/settings',
  '/api/profile',
  '/api/analytics',
  '/api/dashboard',
  '/api/reports',
  '/api/metrics',
  '/api/health',
  '/api/status'
];

export const options = {
  vus: 1,
  duration: '2m',
};

export default function () {
  // 90% normal traffic - fast and successful
  for (let i = 0; i < 9; i++) {
    const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
    const startTime = Date.now();
    
    const res = http.get(`${BASE_URL}${endpoint}`);
    const duration = Date.now() - startTime;
    responseTime.add(duration);
    
    check(res, {
      'status is 200': (r) => r.status === 200,
      'fast response': (r) => r.timings.duration < 1000,
    });
    
    sleep(0.1);
  }
  
  // 10% slow backend requests (THE ISSUE)
  // Delay gradually increases: 3.0s -> 3.8s -> 4.7s -> 5.9s -> 7.2s -> 8.8s -> 10.5s -> 12.4s -> 14.3s -> 15.0s
  // Stays at 15s until 5 minutes, then drops to 3s
  if (Math.random() < 0.1) {
    const elapsedSeconds = Math.floor((Date.now() - testStartTime) / 1000);
    let currentDelay;
    
    if (elapsedSeconds >= 300) {
      // After 5 minutes, decrease to 3000ms
      currentDelay = 3000;
    } else {
      // Increase delay every 10 seconds until max (15000ms)
      const intervalIndex = Math.min(Math.floor(elapsedSeconds / 10), DELAY_VALUES.length - 1);
      currentDelay = DELAY_VALUES[intervalIndex];
    }
    
    const startTime = Date.now();
    const res = http.get(`${BASE_URL}/api/database/query?delay=${currentDelay}`);
    const duration = Date.now() - startTime;
    
    responseTime.add(duration);
    slowRequests.add(1);
    
    check(res, {
      'status is 200': (r) => r.status === 200,
      'backend delay detected': (r) => r.timings.duration >= currentDelay,
    });
  }
  
  // More normal API calls - different patterns
  // Simple GET requests
  http.get(`${BASE_URL}/api/health`);
  http.get(`${BASE_URL}/api/status`);
  
  // API with query parameters
  const userId = Math.floor(Math.random() * 1000);
  http.get(`${BASE_URL}/api/users/${userId}`);
  http.get(`${BASE_URL}/api/orders?userId=${userId}`);
  
  // Search queries
  const searchTerms = ['laptop', 'phone', 'tablet', 'watch', 'headphones'];
  const term = searchTerms[Math.floor(Math.random() * searchTerms.length)];
  http.get(`${BASE_URL}/api/search?q=${term}`);
  
  // Category browsing
  const categories = ['electronics', 'clothing', 'books', 'sports', 'home'];
  const cat = categories[Math.floor(Math.random() * categories.length)];
  http.get(`${BASE_URL}/api/categories/${cat}`);
  
  // Pagination
  const page = Math.floor(Math.random() * 10) + 1;
  http.get(`${BASE_URL}/api/products?page=${page}&limit=20`);
  
  // Sorting/filtering
  http.get(`${BASE_URL}/api/products?sort=price&order=asc`);
  http.get(`${BASE_URL}/api/products?sort=rating&order=desc`);
  
  // Analytics endpoints
  http.get(`${BASE_URL}/api/metrics/daily`);
  http.get(`${BASE_URL}/api/analytics/summary`);
  
  // User activity
  http.get(`${BASE_URL}/api/notifications/unread`);
  http.get(`${BASE_URL}/api/profile/preferences`);
  
  // Batch requests
  const productIds = [101, 102, 103, 104, 105];
  productIds.forEach(id => {
    http.get(`${BASE_URL}/api/products/${id}`);
  });
  
  // Recommendations
  http.get(`${BASE_URL}/api/recommendations/trending`);
  http.get(`${BASE_URL}/api/recommendations/personalized?userId=${userId}`);
  
  // Reviews and ratings
  const productId = Math.floor(Math.random() * 500) + 1;
  http.get(`${BASE_URL}/api/reviews?productId=${productId}`);
  http.get(`${BASE_URL}/api/ratings/average?productId=${productId}`);
  
  // Cart operations
  http.get(`${BASE_URL}/api/cart/items`);
  http.get(`${BASE_URL}/api/cart/total`);
  
  // Wishlist
  http.get(`${BASE_URL}/api/wishlist/count`);
  
  // Settings
  http.get(`${BASE_URL}/api/settings/theme`);
  http.get(`${BASE_URL}/api/settings/language`);
  
  // Dashboard widgets
  http.get(`${BASE_URL}/api/dashboard/stats`);
  http.get(`${BASE_URL}/api/dashboard/recent-activity`);
  
  // Reports (minimal data)
  http.get(`${BASE_URL}/api/reports/summary`);
  
  // More search variations
  http.get(`${BASE_URL}/api/search?q=${term}&category=${cat}`);
  http.get(`${BASE_URL}/api/search/suggestions?q=${term.substring(0, 3)}`);
  
  // Inventory checks
  http.get(`${BASE_URL}/api/inventory/stock?productId=${productId}`);
  http.get(`${BASE_URL}/api/inventory/availability`);
  
  sleep(1);
}

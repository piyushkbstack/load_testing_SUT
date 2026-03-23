/**
 * K6 Test: Mixed Realistic Traffic Pattern
 * Purpose: Simulate realistic production traffic with various scenarios
 * Expected: Mix of success, errors, and latency
 * RCA Signal: Multiple signal types for complex RCA testing
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate } from 'k6/metrics';

const successCount = new Counter('success_requests');
const errorCount = new Counter('error_requests');
const slowCount = new Counter('slow_requests');
const successRate = new Rate('success_rate');

const BASE_URL = __ENV.BASE_URL || 'https://load-testing-sut.pages.dev';

export default function () {
  const rand = Math.random();
  let res;
  let scenario;
  
  // 60% - Normal success
  if (rand < 0.60) {
    scenario = 'normal';
    res = http.get(`${BASE_URL}/api/test`);
  }
  // 15% - Slow response (DB delay)
  else if (rand < 0.75) {
    scenario = 'slow';
    res = http.get(`${BASE_URL}/api/test?delay=2000`);
    slowCount.add(1);
  }
  // 10% - Server error
  else if (rand < 0.85) {
    scenario = 'server_error';
    res = http.get(`${BASE_URL}/api/test?status=500`);
    errorCount.add(1);
  }
  // 5% - Database error
  else if (rand < 0.90) {
    scenario = 'db_error';
    res = http.get(`${BASE_URL}/api/test?status=500&errorType=db`);
    errorCount.add(1);
  }
  // 5% - Auth error
  else if (rand < 0.95) {
    scenario = 'auth_error';
    res = http.get(`${BASE_URL}/api/test?status=401&errorType=auth`);
    errorCount.add(1);
  }
  // 5% - Large payload
  else {
    scenario = 'large_payload';
    res = http.get(`${BASE_URL}/api/test?size=200`);
  }
  
  const isSuccess = res.status >= 200 && res.status < 300;
  
  if (isSuccess) {
    successCount.add(1);
    successRate.add(1);
  } else {
    successRate.add(0);
  }
  
  check(res, {
    'received response': (r) => r.status !== 0,
  });
  
  sleep(Math.random() * 2 + 0.5); // Variable sleep 0.5-2.5s
}

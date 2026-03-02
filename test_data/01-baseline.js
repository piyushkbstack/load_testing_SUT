/**
 * K6 Test: Baseline API Performance
 * Purpose: Establish baseline metrics for normal operation
 * Expected: 100% success rate, low latency
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

const BASE_URL = __ENV.BASE_URL || 'https://load-testing-sut.pages.dev';

export default function () {
  const res = http.get(`${BASE_URL}/api/test`);
  
  const success = check(res, {
    'status is 200': (r) => r.status === 200,
    'response has success field': (r) => JSON.parse(r.body).success === true,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  errorRate.add(!success);
  
  sleep(1);
}

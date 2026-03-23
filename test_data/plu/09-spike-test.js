/**
 * K6 Test: Sudden Traffic Spike
 * Purpose: Test system behavior under sudden load increase
 * Expected: System should handle spike gracefully
 * RCA Signal: Capacity/scaling issues
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
    'response time acceptable': (r) => r.timings.duration < 2000,
  });
  
  errorRate.add(!success);
  
  sleep(0.5); // Shorter sleep for spike intensity
}

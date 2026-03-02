/**
 * K6 Test: Backend Latency Simulation
 * Purpose: Simulate slow database queries or backend processing
 * Expected: 200 responses but with controlled delay
 * RCA Signal: Backend performance degradation
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';

const responseTime = new Trend('response_time_with_delay');

const BASE_URL = __ENV.BASE_URL || 'https://load-testing-sut.pages.dev';

export default function () {
  const startTime = Date.now();
  
  // Simulate backend latency - 3 second delay
  const res = http.get(`${BASE_URL}/api/test?delay=3000`);
  
  const duration = Date.now() - startTime;
  responseTime.add(duration);
  
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response has success field': (r) => JSON.parse(r.body).success === true,
    'delay was applied': (r) => r.timings.duration >= 3000,
  });
  
  sleep(1);
}

/**
 * K6 Test: Progressive Service Degradation
 * Purpose: Simulate gradual performance decline over time
 * Expected: Increasing latency over test duration
 * RCA Signal: Resource exhaustion, memory leak, connection pool depletion
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';

const phaseLatency = new Trend('phase_latency');

const BASE_URL = __ENV.BASE_URL || 'https://load-testing-sut.pages.dev';

export default function () {
  // Simulate progressive degradation based on elapsed time
  const elapsed = Date.now() % 360000; // 6 minute cycle
  let delay = 0;
  
  if (elapsed < 120000) {
    // Phase 1 (0-2 min): Normal operation
    delay = 0;
  } else if (elapsed < 240000) {
    // Phase 2 (2-4 min): Slight degradation
    delay = 1000;
  } else {
    // Phase 3 (4-6 min): Severe degradation
    delay = 3000;
  }
  
  const res = http.get(`${BASE_URL}/api/test?delay=${delay}`);
  
  phaseLatency.add(res.timings.duration);
  
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time matches phase': (r) => r.timings.duration >= delay,
  });
  
  sleep(1);
}

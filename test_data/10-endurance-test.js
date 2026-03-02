/**
 * K6 Test: Endurance/Soak Test
 * Purpose: Test system stability over extended period
 * Expected: Consistent performance over time, no memory leaks
 * RCA Signal: Resource leaks, gradual degradation
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

const responseTime = new Trend('response_time');
const errorRate = new Rate('errors');

const BASE_URL = __ENV.BASE_URL || 'https://load-testing-sut.pages.dev';

export default function () {
  const res = http.get(`${BASE_URL}/api/test`);
  
  responseTime.add(res.timings.duration);
  
  const success = check(res, {
    'status is 200': (r) => r.status === 200,
    'response has required fields': (r) => {
      const body = JSON.parse(r.body);
      return body.success !== undefined && 
             body.timestamp !== undefined &&
             body.route !== undefined;
    },
  });
  
  errorRate.add(!success);
  
  sleep(1);
}

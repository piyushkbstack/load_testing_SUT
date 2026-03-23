/**
 * K6 Test: Server Error Simulation (5xx)
 * Purpose: Simulate infrastructure crash or service failure
 * Expected: 500 error responses
 * RCA Signal: Infrastructure failure, deployment issue
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate } from 'k6/metrics';

const serverErrors = new Counter('server_errors');
const serverErrorRate = new Rate('server_error_rate');

const BASE_URL = __ENV.BASE_URL || 'https://load-testing-sut.pages.dev';

export default function () {
  const res = http.get(`${BASE_URL}/api/test?status=500`);
  
  const is500 = check(res, {
    'status is 500': (r) => r.status === 500,
    'response has success=false': (r) => JSON.parse(r.body).success === false,
    'message is present': (r) => JSON.parse(r.body).message !== undefined,
  });
  
  if (res.status === 500) {
    serverErrors.add(1);
    serverErrorRate.add(1);
  } else {
    serverErrorRate.add(0);
  }
  
  sleep(1);
}

/**
 * K6 Test: Authentication Failure
 * Purpose: Simulate auth/authorization issues
 * Expected: 401 Unauthorized responses
 * RCA Signal: Functional auth bug, token expiration
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate } from 'k6/metrics';

const authErrors = new Counter('auth_errors');
const authErrorRate = new Rate('auth_error_rate');

const BASE_URL = __ENV.BASE_URL || 'https://load-testing-sut.pages.dev';

export default function () {
  const res = http.get(`${BASE_URL}/api/test?status=401&errorType=auth`);
  
  const isAuthError = check(res, {
    'status is 401': (r) => r.status === 401,
    'has auth error message': (r) => {
      const body = JSON.parse(r.body);
      return body.message.includes('Unauthorized access');
    },
    'success is false': (r) => JSON.parse(r.body).success === false,
  });
  
  if (res.status === 401) {
    authErrors.add(1);
    authErrorRate.add(1);
  } else {
    authErrorRate.add(0);
  }
  
  sleep(1);
}

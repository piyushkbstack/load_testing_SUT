/**
 * K6 Test: Database Connection Failure
 * Purpose: Simulate database timeout or connection pool exhaustion
 * Expected: 500 error with DB-specific error message
 * RCA Signal: Database layer failure
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';

const dbErrors = new Counter('database_errors');

const BASE_URL = __ENV.BASE_URL || 'https://load-testing-sut.pages.dev';

export default function () {
  const res = http.get(`${BASE_URL}/api/test?status=500&errorType=db`);
  
  const isDbError = check(res, {
    'status is 500': (r) => r.status === 500,
    'has DB error message': (r) => {
      const body = JSON.parse(r.body);
      return body.message.includes('Database connection timeout');
    },
    'success is false': (r) => JSON.parse(r.body).success === false,
  });
  
  if (isDbError) {
    dbErrors.add(1);
  }
  
  sleep(1);
}

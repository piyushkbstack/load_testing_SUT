/**
 * K6 Test: Large Payload Response
 * Purpose: Test network bandwidth and parsing performance
 * Expected: 200 responses with large data payload
 * RCA Signal: Network saturation, frontend parsing delays
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';

const payloadSize = new Trend('payload_size_kb');
const downloadTime = new Trend('download_time_ms');

const BASE_URL = __ENV.BASE_URL || 'https://load-testing-sut.pages.dev';

export default function () {
  const startTime = Date.now();
  
  // Request 500KB payload
  const res = http.get(`${BASE_URL}/api/test?size=500`);
  
  const duration = Date.now() - startTime;
  downloadTime.add(duration);
  
  const sizeInKB = res.body.length / 1024;
  payloadSize.add(sizeInKB);
  
  check(res, {
    'status is 200': (r) => r.status === 200,
    'has largeData field': (r) => JSON.parse(r.body).largeData !== undefined,
    'payload is large': (r) => r.body.length > 400000, // ~400KB+
  });
  
  sleep(2); // Longer sleep due to large payload
}

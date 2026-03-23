/**
 * K6 Test: Frontend Page Load Performance
 * Purpose: Test browser page rendering and asset loading
 * Expected: Measure page load time and asset delivery
 * RCA Signal: Frontend performance regression
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';

const pageLoadTime = new Trend('page_load_time');
const imageLoadTime = new Trend('image_load_time');

const BASE_URL = __ENV.BASE_URL || 'https://load-testing-sut.pages.dev';

export default function () {
  // Load main page
  const pageStart = Date.now();
  const mainPage = http.get(`${BASE_URL}/`);
  pageLoadTime.add(Date.now() - pageStart);
  
  check(mainPage, {
    'main page loads': (r) => r.status === 200,
    'page has content': (r) => r.body.length > 0,
  });
  
  // Load large page
  const largePageStart = Date.now();
  const largePage = http.get(`${BASE_URL}/large.html`);
  const largeDuration = Date.now() - largePageStart;
  
  check(largePage, {
    'large page loads': (r) => r.status === 200,
  });
  
  // Load image asset
  const imageStart = Date.now();
  const image = http.get(`${BASE_URL}/assets/large-image.jpg`);
  imageLoadTime.add(Date.now() - imageStart);
  
  check(image, {
    'image loads': (r) => r.status === 200,
    'image is jpg': (r) => r.headers['Content-Type']?.includes('image'),
  });
  
  sleep(2);
}

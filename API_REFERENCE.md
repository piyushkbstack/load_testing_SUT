# 📚 API Reference - RCA Mock Site

> **Purpose:** Comprehensive endpoint documentation for load testing and Root Cause Analysis (RCA) validation.

---

## 🌐 Base URL

**Production:** `https://rca-mock-site.pages.dev`  
**Local Dev:** `http://localhost:8788`

---

## 🎯 Core API Endpoints

### 1. **Basic API Call**
```
GET /api/test
```

**Purpose:** Baseline success response for load testing  
**Expected Status:** `200 OK`  
**Response:**
```json
{
  "success": true,
  "timestamp": 1707843200000,
  "route": "/api/test",
  "message": "Mock API response"
}
```

**Use Case:** Establish baseline performance metrics

---

### 2. **Latency Injection (Backend Slowness)**
```
GET /api/test?delay=3000
```

**Purpose:** Simulate backend latency or database bottleneck  
**Query Parameters:**
- `delay` (integer, ms): Artificial delay before response

**Expected Status:** `200 OK` (after delay)  
**RCA Signal:** Backend/database performance degradation  

**Example:**
```bash
curl "https://rca-mock-site.pages.dev/api/test?delay=3000"
# Returns after 3 seconds
```

**Use Case:** Test RCA detection of slow database queries, network latency, or backend processing delays

---

### 3. **Server Error (Infrastructure Crash)**
```
GET /api/test?status=500
```

**Purpose:** Simulate server crash or infrastructure failure  
**Query Parameters:**
- `status` (integer): HTTP status code to return

**Expected Status:** `500 Internal Server Error`  
**Response:**
```json
{
  "success": false,
  "timestamp": 1707843200000,
  "route": "/api/test",
  "message": "Mock API response"
}
```

**RCA Signal:** Infrastructure failure, service crash, deployment error  

**Use Case:** Train RCA to distinguish infra issues from functional bugs

---

### 4. **Database Error (Semantic Failure)**
```
GET /api/test?status=500&errorType=db
```

**Purpose:** Simulate database-specific failure  
**Query Parameters:**
- `status=500`: Server error
- `errorType=db`: Database failure indicator

**Expected Status:** `500 Internal Server Error`  
**Response:**
```json
{
  "success": false,
  "timestamp": 1707843200000,
  "route": "/api/test",
  "message": "Database connection timeout"
}
```

**RCA Signal:** Database connectivity, timeout, or query failure  

**Use Case:** Test RCA ability to identify database-layer issues vs general server errors

---

### 5. **Authentication Failure**
```
GET /api/test?status=401&errorType=auth
```

**Purpose:** Simulate authentication/authorization failure  
**Query Parameters:**
- `status=401`: Unauthorized
- `errorType=auth`: Auth failure indicator

**Expected Status:** `401 Unauthorized`  
**Response:**
```json
{
  "success": false,
  "timestamp": 1707843200000,
  "route": "/api/test",
  "message": "Unauthorized access"
}
```

**RCA Signal:** Functional bug in auth logic, token expiration, permission issue  

**Use Case:** Distinguish functional auth bugs from infrastructure problems

---

### 6. **Large Payload (Network Stress)**
```
GET /api/test?size=500
```

**Purpose:** Simulate large response payload  
**Query Parameters:**
- `size` (integer): Multiplier for response size (KB)

**Expected Status:** `200 OK`  
**Response:**
```json
{
  "success": true,
  "timestamp": 1707843200000,
  "route": "/api/test",
  "message": "Mock API response",
  "largeData": "xxxx..." // size * 1000 characters
}
```

**RCA Signal:** Network bandwidth saturation, frontend parsing delays  

**Use Case:** Test impact of large responses on frontend performance (LCP, FCP)

---

### 7. **Combined Scenario (Multiple Issues)**
```
GET /api/test?delay=2000&status=500&size=100
```

**Purpose:** Simulate complex failure scenario  
**Expected Status:** `500 Internal Server Error` (after 2s delay)  
**Response:** Large error payload with delay

**RCA Signal:** Multi-layered issue (slow + error + large payload)  

**Use Case:** Test RCA prioritization and multi-factor analysis

---

## 🌍 Frontend Pages

### 8. **Main Page (Basic Browser Metrics)**
```
GET /
GET /index.html
```

**Purpose:** Measure browser performance metrics  
**Metrics Captured:**
- **LCP** (Largest Contentful Paint): Image load time
- **FCP** (First Contentful Paint): Initial render time
- **TTFB** (Time to First Byte): Server response time
- **INP** (Interaction to Next Paint): Button click responsiveness

**Elements:**
- Image asset (`/assets/large-image.jpg`)
- Interactive button triggering API call
- Performance measurement script

**Use Case:** Establish frontend baseline, detect regression in browser metrics

---

### 9. **Large Page (LCP Stress Test)**
```
GET /large.html
```

**Purpose:** Test Largest Contentful Paint under load  
**Characteristics:**
- Multiple large images
- Heavy DOM structure
- Intentional LCP slowness

**RCA Signal:** Frontend performance regression  

**Use Case:** Distinguish backend latency from frontend rendering issues

---

## 🧪 Load Testing Patterns

### Pattern 1: Baseline Load
```bash
# 70% baseline success, 30% various delays
/api/test (70%)
/api/test?delay=1000 (20%)
/api/test?delay=3000 (10%)
```

### Pattern 2: Error Rate Testing
```bash
# Gradual error introduction
/api/test (90%)
/api/test?status=500 (5%)
/api/test?status=401&errorType=auth (5%)
```

### Pattern 3: Latency Spike Simulation
```bash
# Sudden backend degradation
Time 0-5min: /api/test
Time 5-10min: /api/test?delay=5000 (100%)
Time 10-15min: /api/test
```

### Pattern 4: Database Failure Scenario
```bash
# Progressive database issues
/api/test (50%)
/api/test?delay=2000 (30%)
/api/test?status=500&errorType=db (20%)
```

### Pattern 5: Mixed Chaos
```bash
# Random weighted distribution
/api/test?delay=1000&size=100 (25%)
/api/test?status=500 (15%)
/api/test?delay=3000 (10%)
/api/test (50%)
```

---

## 📊 RCA Signal Mapping Table

| Observed Behavior | Expected RCA Root Cause | Endpoint to Use |
|-------------------|------------------------|-----------------|
| Response time ↑ (no errors) | Backend latency / DB slow query | `?delay=3000` |
| 5xx error rate spike | Infrastructure crash / deployment issue | `?status=500` |
| 4xx error rate spike | Functional bug (auth/validation) | `?status=401&errorType=auth` |
| LCP/FCP regression | Frontend code change | `/large.html` + `?delay=0` |
| Gradual response time increase | Database connection pool exhaustion | `?delay=2000&errorType=db` |
| Mixed errors + latency | Multi-tier failure (DB + backend) | `?delay=2000&status=500` |
| Large payload + slow LCP | Network bandwidth saturation | `?size=500` + `/large.html` |

---

## 🔧 Query Parameter Reference

| Parameter | Type | Default | Range | Purpose |
|-----------|------|---------|-------|---------|
| `delay` | integer (ms) | 0 | 0-30000 | Add artificial latency |
| `status` | integer | 200 | 200-599 | HTTP status code to return |
| `size` | integer (KB multiplier) | 1 | 1-10000 | Response payload size |
| `errorType` | string | null | `db`, `auth`, `network` | Semantic error classification |

---

## 🚀 Example Load Test Script (K6)

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 100 },  // Ramp up
    { duration: '5m', target: 100 },  // Sustain
    { duration: '2m', target: 0 },    // Ramp down
  ],
};

export default function () {
  const baseUrl = 'https://rca-mock-site.pages.dev';
  
  // 70% success
  if (Math.random() < 0.7) {
    let res = http.get(`${baseUrl}/api/test`);
    check(res, { 'status is 200': (r) => r.status === 200 });
  }
  
  // 20% latency
  else if (Math.random() < 0.9) {
    let res = http.get(`${baseUrl}/api/test?delay=2000`);
    check(res, { 'status is 200': (r) => r.status === 200 });
  }
  
  // 10% error
  else {
    let res = http.get(`${baseUrl}/api/test?status=500&errorType=db`);
    check(res, { 'status is 500': (r) => r.status === 500 });
  }
  
  sleep(1);
}
```

---

## 🧰 Validation

Run the automated validation suite:

```bash
# Local
./validate.sh http://localhost:8788

# Production
./validate.sh https://rca-mock-site.pages.dev
```

**Expected Output:**
```
Testing: Basic API call ... ✓ PASS
Testing: Delayed response (2s) ... ✓ PASS
Testing: 500 error ... ✓ PASS
Testing: DB error ... ✓ PASS
Testing: Auth error ... ✓ PASS
Testing: Large payload ... ✓ PASS
Testing: Combined delay + error ... ✓ PASS
Testing: Main page ... ✓ PASS
Testing: Large page ... ✓ PASS
Testing: Image asset ... ✓ PASS

Results: 10/10 tests passed
```

---

## 📝 Notes

### Determinism
All endpoints are **100% deterministic**. Same input = same output.  
No randomness, no side effects, no state changes.

### Rate Limits
Cloudflare Pages free tier:
- 100k requests/day
- No burst limits (serverless auto-scales)

### Caching
All API responses have `Cache-Control: no-store` header.  
Every request hits the Function.

### Latency Control
The `delay` parameter uses `setTimeout` in the serverless function.  
Max delay: 30s (Cloudflare Function timeout).

---

## 🎓 Best Practices for RCA Testing

1. **Establish Baseline:** Run 5-10min of pure `/api/test` to get normal metrics
2. **Introduce Chaos:** Gradually increase error rate or latency
3. **Mix Signals:** Combine multiple parameters to test RCA disambiguation
4. **Frontend Testing:** Alternate between API calls and `/large.html` loads
5. **Time-Series Analysis:** Inject failures at specific timestamps to test correlation detection

---

## 🔗 Related Documentation

- [README.md](README.md) - Project overview
- [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment guide  
- [TEST_SCENARIOS.md](TEST_SCENARIOS.md) - Detailed test scenarios
- [QUICKSTART.md](QUICKSTART.md) - Quick setup guide

---

## 📞 Support

For issues or questions:
- Check [DEPLOYMENT.md](DEPLOYMENT.md) for troubleshooting
- Review [validate.sh](validate.sh) for test patterns
- Inspect [functions/api/[[route]].js](functions/api/[[route]].js) for implementation

---

**Last Updated:** February 13, 2026  
**Version:** 1.0.0  
**Status:** Production Ready ✅

# 🧪 K6 Load Test Scripts

This directory contains individual K6 load testing scripts, each designed to test specific failure scenarios and API behaviors for RCA validation.

---

## 📋 Test Scripts Overview

| Script | Purpose | RCA Signal | Load Level |
|--------|---------|------------|------------|
| `01-baseline.js` | Normal operation baseline | None (healthy) | Medium-High |
| `02-backend-latency.js` | Backend/DB slowness | Backend degradation | Medium |
| `03-server-crash.js` | Infrastructure failure | Infra crash | Medium |
| `04-database-failure.js` | Database connection issues | DB layer failure | Medium |
| `05-auth-failure.js` | Authentication problems | Functional auth bug | Low-Medium |
| `06-large-payload.js` | Network bandwidth stress | Network saturation | Low |
| `07-progressive-degradation.js` | Gradual performance decline | Resource exhaustion | Medium |
| `08-mixed-realistic.js` | Production-like traffic | Multiple signals | Medium-High |
| `09-spike-test.js` | Sudden load increase | Capacity/scaling issues | High |
| `10-endurance-test.js` | Long-term stability | Memory leaks | Medium |
| `11-frontend-performance.js` | Page load performance | Frontend regression | Medium |

---

## 🚀 Running Tests

### Prerequisites

Install K6:

```bash
# macOS
brew install k6

# Linux
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Windows
choco install k6
```

### Important Note

**All load profiles (stages, iterations, thresholds) have been removed from scripts.**  
Configure load externally using K6 CLI options or your load testing tool.

### Run Individual Test

```bash
# Simple run with VUs and duration
k6 run --vus 50 --duration 5m test_data/01-baseline.js

# Test against custom URL
k6 run --vus 50 --duration 5m -e BASE_URL=http://localhost:8788 test_data/01-baseline.js

# Using iterations instead of duration
k6 run --vus 100 --iterations 1000 test_data/01-baseline.js
```

### Load Configuration Options

```bash
# Fixed VUs and duration
k6 run --vus 100 --duration 10m test_data/01-baseline.js

# Ramping VUs with stages
k6 run --stage 2m:50,5m:50,2m:0 test_data/01-baseline.js

# Arrival rate (requests per second)
k6 run --rps 100 --duration 5m test_data/01-baseline.js

# Output results to file
k6 run --vus 50 --duration 5m --out json=results.json test_data/01-baseline.js

# Summary export
k6 run --vus 50 --duration 5m --summary-export=summary.json test_data/01-baseline.js
```

---

## 📊 Test Scenarios Explained

### 1. Baseline Test (`01-baseline.js`)
**Purpose:** Establish normal operation metrics  
**Expected:**
- 100% success rate
- Response time < 500ms (p95)
- Error rate < 1%

**Example:**
```bash
k6 run --vus 50 --duration 5m test_data/01-baseline.js
```

**Use Case:** Run first to establish baseline before introducing chaos

---

### 2. Backend Latency (`02-backend-latency.js`)
**Purpose:** Simulate slow database queries  
**Expected:**
- 200 OK responses
- ~3 second delay per request
- Consistent timing

**Example:**
```bash
k6 run --vus 30 --duration 5m test_data/02-backend-latency.js
```

**Use Case:** Train RCA to detect backend performance issues

---

### 3. Server Crash (`03-server-crash.js`)
**Purpose:** Simulate infrastructure failure  
**Expected:**
- 95%+ error rate (500 status)
- Fast response times (no delay)
- Generic error messages

**Example:**
```bash
k6 run --vus 30 --duration 5m test_data/03-server-crash.js
```

**Use Case:** Distinguish infra failures from functional bugs

---

### 4. Database Failure (`04-database-failure.js`)
**Purpose:** Simulate DB connection timeout  
**Expected:**
- 500 errors with "Database connection timeout" message
- High error count

**Example:**
```bash
k6 run --vus 40 --duration 5m test_data/04-database-failure.js
```

**Use Case:** Identify database-specific issues vs general server errors

---

### 5. Auth Failure (`05-auth-failure.js`)
**Purpose:** Simulate authentication issues  
**Expected:**
- 401 Unauthorized responses
- "Unauthorized access" message
- 95%+ auth error rate

**Example:**
```bash
k6 run --vus 25 --duration 5m test_data/05-auth-failure.js
```

**Use Case:** Detect functional auth bugs vs infrastructure problems

---

### 6. Large Payload (`06-large-payload.js`)
**Purpose:** Test network bandwidth and parsing  
**Expected:**
- 500KB+ response bodies
- Slower response times
- Larger download times

**Example:**
```bash
k6 run --vus 20 --duration 5m test_data/06-large-payload.js
```

**Use Case:** Identify network saturation or frontend parsing bottlenecks

---

### 7. Progressive Degradation (`07-progressive-degradation.js`)
**Purpose:** Simulate gradual performance decline  
**Pattern:**
- Phase 1 (0-2 min): No delay
- Phase 2 (2-4 min): 1s delay
- Phase 3 (4-6 min): 3s delay

**Example:**
```bash
k6 run --vus 30 --duration 6m test_data/07-progressive-degradation.js
```

**Use Case:** Test RCA ability to detect gradual resource exhaustion

---

### 8. Mixed Realistic (`08-mixed-realistic.js`)
**Purpose:** Production-like traffic pattern  
**Distribution:**
- 60% normal
- 15% slow
- 10% server error
- 5% DB error
- 5% auth error
- 5% large payload

**Example:**
```bash
k6 run --vus 50 --duration 10m test_data/08-mixed-realistic.js
```

**Use Case:** Complex RCA testing with multiple simultaneous signals

---

### 9. Spike Test (`09-spike-test.js`)
**Purpose:** Sudden traffic surge  
**Expected:**
- System handles spike gracefully
- Low error rate
- Response times stay reasonable

**Example:**
```bash
# Simulate spike with stages
k6 run --stage 2m:10,30s:200,3m:200,1m:0 test_data/09-spike-test.js
```

**Use Case:** Test auto-scaling and capacity handling

---

### 10. Endurance Test (`10-endurance-test.js`)
**Purpose:** Long-term stability  
**Expected:**
- Consistent performance throughout
- No memory leaks
- Stable response times

**Example:**
```bash
k6 run --vus 30 --duration 30m test_data/10-endurance-test.js
```

**Use Case:** Detect gradual resource leaks or degradation

---

### 11. Frontend Performance (`11-frontend-performance.js`)
**Purpose:** Browser page and asset loading  
**Expected:**
- Fast page load times
- Fast image load times

**Example:**
```bash
k6 run --vus 30 --duration 5m test_data/11-frontend-performance.js
```

**Use Case:** Distinguish backend latency from frontend rendering issues

---

## 🎯 Recommended Test Sequence

For comprehensive RCA validation:

```bash
# 1. Establish baseline
k6 run --vus 50 --duration 5m test_data/01-baseline.js

# 2. Test individual failure modes
k6 run --vus 30 --duration 5m test_data/02-backend-latency.js
k6 run --vus 30 --duration 5m test_data/03-server-crash.js
k6 run --vus 40 --duration 5m test_data/04-database-failure.js
k6 run --vus 25 --duration 5m test_data/05-auth-failure.js

# 3. Test resource limits
k6 run --vus 20 --duration 5m test_data/06-large-payload.js
k6 run --stage 2m:10,30s:200,3m:200,1m:0 test_data/09-spike-test.js

# 4. Test complex scenarios
k6 run --vus 30 --duration 6m test_data/07-progressive-degradation.js
k6 run --vus 50 --duration 10m test_data/08-mixed-realistic.js

# 5. Stability test (run last)
k6 run --vus 30 --duration 30m test_data/10-endurance-test.js
```

---

## 📈 Monitoring K6 Output

### Real-time Dashboard

Use K6 Cloud or InfluxDB + Grafana:

```bash
# With K6 Cloud
k6 run --out cloud test_data/01-baseline.js

# With InfluxDB
k6 run --out influxdb=http://localhost:8086/k6 test_data/01-baseline.js
```

### Key Metrics to Watch

- `http_req_duration`: Response time distribution
- `http_req_failed`: Error rate
- `http_reqs`: Request rate (RPS)
- `vus`: Virtual users (concurrency)
- Custom metrics: `server_errors`, `auth_errors`, `payload_size_kb`

---

## 🔧 Customization

### Change Base URL

```bash
# Test local development
k6 run -e BASE_URL=http://localhost:8788 test_data/01-baseline.js

# Test staging
k6 run -e BASE_URL=https://staging.example.com test_data/01-baseline.js
```

### Modify Load Profile

Use K6 CLI options to control load:

```bash
# Constant load
k6 run --vus 50 --duration 5m test_data/01-baseline.js

# Ramping load with stages
k6 run --stage 1m:10,2m:50,2m:100,1m:0 test_data/01-baseline.js

# Iteration-based (not time-based)
k6 run --vus 100 --iterations 10000 test_data/01-baseline.js
```

### Add Custom Checks

```javascript
check(res, {
  'custom validation': (r) => {
    const body = JSON.parse(r.body);
    return body.customField === 'expectedValue';
  },
});
```

---

## 📊 Example Output

```
execution: local
    script: test_data/01-baseline.js
    output: -

scenarios: (100.00%) 1 scenario, 100 max VUs, 10m30s max duration

    ✓ status is 200
    ✓ response has success field
    ✓ response time < 500ms

    checks.........................: 100.00% ✓ 30000     ✗ 0
    data_received..................: 12 MB   20 kB/s
    data_sent......................: 3.0 MB  5.0 kB/s
    http_req_duration..............: avg=145ms   p(95)=234ms
    http_req_failed................: 0.00%   ✓ 0         ✗ 10000
    http_reqs......................: 10000   16.67/s
    iteration_duration.............: avg=1.15s
    vus............................: 100     min=0       max=100
```

---

## 🐛 Troubleshooting

### Connection Refused
```bash
# Verify site is accessible
curl https://load-testing-sut.pages.dev/api/test

# Check BASE_URL is correct
k6 run -e BASE_URL=https://load-testing-sut.pages.dev test_data/01-baseline.js
```

### High Error Rate on Baseline
```bash
# Check if site is deployed
./validate.sh https://load-testing-sut.pages.dev

# Reduce load
k6 run --vus 10 test_data/01-baseline.js
```

### Timeout Errors
```bash
# Increase timeout (default 60s)
k6 run --http-debug test_data/02-backend-latency.js
```

---

## 📚 Additional Resources

- [K6 Documentation](https://k6.io/docs/)
- [K6 CLI Options](https://k6.io/docs/using-k6/k6-options/)
- [Test Scenario Design](https://k6.io/docs/test-types/introduction/)

---

## 🔄 Running All Tests

Use the runner script with custom load parameters:

```bash
# Default: 30 VUs, 5 minute duration
./test_data/run-all-tests.sh

# Custom load
./test_data/run-all-tests.sh https://load-testing-sut.pages.dev 50 10m

# Local testing
./test_data/run-all-tests.sh http://localhost:8788 20 3m
```

---

**Last Updated:** February 16, 2026  
**Total Scripts:** 11  
**Status:** Production Ready ✅

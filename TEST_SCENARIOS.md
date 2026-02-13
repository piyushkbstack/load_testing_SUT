# Load Testing Scenarios for RCA Validation

This document defines deterministic test scenarios for validating RCA (Root Cause Analysis) capabilities.

## 📊 Scenario Categories

### 1. Backend Latency Scenarios

#### Scenario 1.1: Database Bottleneck
```json
{
  "name": "DB_Bottleneck",
  "duration": "5m",
  "pattern": "constant",
  "rps": 100,
  "endpoints": [
    {
      "path": "/api/test?delay=2000&errorType=db",
      "method": "GET",
      "weight": 100
    }
  ],
  "expected_rca": "Backend database latency",
  "signal_markers": {
    "p95_latency": ">2000ms",
    "error_rate": "0%",
    "status_codes": "200"
  }
}
```

#### Scenario 1.2: Gradual Degradation
```json
{
  "name": "Gradual_Backend_Degradation",
  "duration": "10m",
  "pattern": "ramp",
  "timeline": [
    {"time": "0-2m", "delay": 100},
    {"time": "2-4m", "delay": 500},
    {"time": "4-6m", "delay": 1000},
    {"time": "6-8m", "delay": 2000},
    {"time": "8-10m", "delay": 3000}
  ],
  "endpoints": [
    {
      "path": "/api/test?delay={delay}",
      "method": "GET"
    }
  ],
  "expected_rca": "Progressive backend performance degradation",
  "signal_markers": {
    "latency_trend": "increasing",
    "error_rate": "0%"
  }
}
```

---

### 2. Infrastructure Failure Scenarios

#### Scenario 2.1: Complete Service Crash
```json
{
  "name": "Service_Crash_500",
  "duration": "5m",
  "pattern": "constant",
  "rps": 50,
  "endpoints": [
    {
      "path": "/api/test?status=500",
      "method": "GET",
      "weight": 100
    }
  ],
  "expected_rca": "Infrastructure failure / Service crash",
  "signal_markers": {
    "error_rate": "100%",
    "status_codes": "500",
    "latency": "normal"
  }
}
```

#### Scenario 2.2: Intermittent Failures (20% error rate)
```json
{
  "name": "Intermittent_Failures",
  "duration": "10m",
  "pattern": "constant",
  "rps": 100,
  "endpoints": [
    {
      "path": "/api/test",
      "method": "GET",
      "weight": 80
    },
    {
      "path": "/api/test?status=500",
      "method": "GET",
      "weight": 20
    }
  ],
  "expected_rca": "Intermittent infrastructure issues",
  "signal_markers": {
    "error_rate": "~20%",
    "status_codes": "200, 500",
    "pattern": "sporadic"
  }
}
```

#### Scenario 2.3: 503 Service Unavailable
```json
{
  "name": "Service_Unavailable",
  "duration": "5m",
  "pattern": "spike",
  "rps": 200,
  "endpoints": [
    {
      "path": "/api/test?status=503&errorType=db",
      "method": "GET",
      "weight": 100
    }
  ],
  "expected_rca": "Service temporarily unavailable / Database connection pool exhausted",
  "signal_markers": {
    "error_rate": "100%",
    "status_codes": "503",
    "error_type": "db"
  }
}
```

---

### 3. Functional Errors

#### Scenario 3.1: Authentication Failures
```json
{
  "name": "Auth_Failure_401",
  "duration": "5m",
  "pattern": "constant",
  "rps": 50,
  "endpoints": [
    {
      "path": "/api/test?status=401&errorType=auth",
      "method": "GET",
      "weight": 100
    }
  ],
  "expected_rca": "Authentication service failure",
  "signal_markers": {
    "error_rate": "100%",
    "status_codes": "401",
    "error_type": "auth",
    "latency": "normal"
  }
}
```

#### Scenario 3.2: Sudden Auth Spike (50% failures)
```json
{
  "name": "Sudden_Auth_Spike",
  "duration": "10m",
  "pattern": "sudden_change",
  "timeline": [
    {"time": "0-5m", "auth_failures": 0},
    {"time": "5-10m", "auth_failures": 50}
  ],
  "endpoints": [
    {
      "path": "/api/test",
      "weight": 50
    },
    {
      "path": "/api/test?status=401&errorType=auth",
      "weight": 50
    }
  ],
  "expected_rca": "Authentication system deployment issue at T+5m",
  "signal_markers": {
    "change_point": "5m",
    "pre_error_rate": "0%",
    "post_error_rate": "50%"
  }
}
```

---

### 4. Frontend Regression

#### Scenario 4.1: Large Payload Impact
```json
{
  "name": "Large_Payload_Frontend_Impact",
  "duration": "5m",
  "pattern": "constant",
  "rps": 20,
  "endpoints": [
    {
      "path": "/api/test?size=1000",
      "method": "GET",
      "weight": 100
    }
  ],
  "browser_metrics": {
    "collect": true,
    "page": "/large.html",
    "metrics": ["LCP", "FCP", "TTFB"]
  },
  "expected_rca": "Frontend regression due to large payload",
  "signal_markers": {
    "api_latency": "normal",
    "payload_size": ">1MB",
    "lcp": "degraded"
  }
}
```

#### Scenario 4.2: LCP Regression
```json
{
  "name": "LCP_Regression",
  "duration": "10m",
  "pattern": "browser_load",
  "rps": 10,
  "browser_metrics": {
    "page": "/large.html",
    "metrics": ["LCP", "INP", "FCP", "TTFB"],
    "iterations": 50
  },
  "expected_rca": "Largest Contentful Paint regression",
  "signal_markers": {
    "lcp": ">2500ms",
    "api_status": "healthy",
    "infrastructure": "healthy"
  }
}
```

---

### 5. Mixed Realistic Scenarios

#### Scenario 5.1: Production-like Traffic (70/20/10)
```json
{
  "name": "Production_Traffic_Mix",
  "duration": "15m",
  "pattern": "constant",
  "rps": 100,
  "endpoints": [
    {
      "path": "/api/test",
      "method": "GET",
      "weight": 70,
      "comment": "Successful requests"
    },
    {
      "path": "/api/test?delay=2000",
      "method": "GET",
      "weight": 20,
      "comment": "Slow DB queries"
    },
    {
      "path": "/api/test?status=500",
      "method": "GET",
      "weight": 10,
      "comment": "Infrastructure errors"
    }
  ],
  "expected_rca": "Mixed signals: DB latency (20%) + Infrastructure failures (10%)",
  "signal_markers": {
    "success_rate": "70%",
    "slow_requests": "20%",
    "failed_requests": "10%"
  }
}
```

#### Scenario 5.2: Traffic Spike + Degradation
```json
{
  "name": "Traffic_Spike_With_Degradation",
  "duration": "10m",
  "pattern": "spike",
  "timeline": [
    {"time": "0-3m", "rps": 50, "delay": 100},
    {"time": "3-7m", "rps": 500, "delay": 1500},
    {"time": "7-10m", "rps": 50, "delay": 100}
  ],
  "endpoints": [
    {
      "path": "/api/test?delay={delay}"
    }
  ],
  "expected_rca": "Backend overload during traffic spike causing latency increase",
  "signal_markers": {
    "spike_start": "3m",
    "spike_end": "7m",
    "latency_correlation": "positive with traffic"
  }
}
```

---

## 🎯 RCA Validation Matrix

| Scenario Type | Expected Primary Signal | Expected Secondary Signals | RCA Expected |
|---------------|------------------------|---------------------------|--------------|
| DB Bottleneck | Latency ↑ | Error rate: 0% | Backend/DB |
| Service Crash | Error rate: 100% | Status: 500 | Infrastructure |
| Auth Failure | Error rate: 100% | Status: 401 | Functional/Auth |
| Large Payload | Latency ↑ + LCP ↑ | Backend healthy | Frontend |
| LCP Regression | LCP ↑ | API healthy | Frontend |
| Intermittent | Error rate: 20% | Sporadic 500s | Infrastructure |
| Traffic Spike | Latency ↑ during spike | Traffic correlation | Capacity |

---

## 📐 Implementation Examples

### K6 Load Test Example
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 100 },  // Ramp up
    { duration: '5m', target: 100 },  // Steady
    { duration: '2m', target: 0 },    // Ramp down
  ],
};

export default function () {
  // 70% success
  if (Math.random() < 0.7) {
    http.get('https://your-site.pages.dev/api/test');
  }
  // 20% slow
  else if (Math.random() < 0.9) {
    http.get('https://your-site.pages.dev/api/test?delay=2000');
  }
  // 10% error
  else {
    http.get('https://your-site.pages.dev/api/test?status=500');
  }
  
  sleep(1);
}
```

### JMeter CSV Format
```csv
endpoint,method,expected_status,delay,size,errorType,weight
/api/test,GET,200,0,1,,70
/api/test,GET,200,2000,1,db,20
/api/test,GET,500,0,1,,10
```

### Artillery.io Example
```yaml
config:
  target: "https://your-site.pages.dev"
  phases:
    - duration: 300
      arrivalRate: 100
scenarios:
  - name: "Mixed traffic"
    flow:
      - get:
          url: "/api/test"
          weight: 70
      - get:
          url: "/api/test?delay=2000"
          weight: 20
      - get:
          url: "/api/test?status=500"
          weight: 10
```

---

## 🔍 Signal Collection Requirements

For accurate RCA validation, collect:

### Metrics
- Request latency (p50, p95, p99)
- Error rate by status code
- Request rate (RPS)
- Payload size
- Time-series data (1s granularity)

### Metadata
- Timestamp
- Endpoint path
- Query parameters
- Response status
- Response time
- Payload size

### Browser Metrics (if applicable)
- LCP (Largest Contentful Paint)
- FCP (First Contentful Paint)
- INP (Interaction to Next Paint)
- TTFB (Time to First Byte)
- CLS (Cumulative Layout Shift)

---

## ✅ Validation Checklist

Before running load tests:

- [ ] Site deployed and accessible
- [ ] `validate.sh` passes all tests
- [ ] Each endpoint responds correctly
- [ ] Delays work as expected
- [ ] Status codes are correct
- [ ] Payload sizes match requests
- [ ] No caching interferes with tests
- [ ] Monitoring/metrics collection ready

---

## 📊 Expected Outputs for RCA Agent

Each scenario should produce:

1. **Metrics Dataset**
   - Time-series of latency, error rate, throughput
   
2. **Ground Truth Label**
   - Expected RCA category (Backend/Frontend/Infrastructure/Functional)
   
3. **Confidence Signal**
   - Primary vs. secondary indicators
   
4. **Temporal Markers**
   - When issue started/ended
   - Change points

---

## 🎯 Success Criteria

RCA agent should correctly identify:

- ✅ Backend issues when latency increases with normal error rates
- ✅ Infrastructure failures when error rates spike
- ✅ Functional issues (auth) based on 401 status codes
- ✅ Frontend regressions when browser metrics degrade
- ✅ Mixed scenarios with multiple contributing factors

---

Use these scenarios to generate comprehensive training/validation datasets for your RCA system.

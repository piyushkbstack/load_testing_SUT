# RCA Mock Site - Load Testing SUT

A production-ready **System Under Test (SUT)** for load testing and Root Cause Analysis (RCA) validation.

## 🎯 Purpose

This is a **deterministic mock API** built with Cloudflare Pages + Functions designed for:

- ✅ Load testing with controlled behaviors
- ✅ RCA agent validation
- ✅ Browser performance metrics testing (LCP, INP, FCP, TTFB)
- ✅ Simulating real-world failure scenarios

## 🏗️ Architecture

```
/ (repo root)
│
├── package.json
├── wrangler.toml
├── README.md
├── DEPLOYMENT.md
│
├── /public
│   ├── index.html          # Main page with API call
│   ├── large.html          # LCP testing page
│   └── /assets
│       └── large-image.jpg # 1200x800 test image
│
└── /functions
    └── /api
        └── [[route]].js    # Catch-all API handler
```

## 🚀 Features

### Controlled API Behaviors

The API supports query parameters for deterministic testing:

| Parameter   | Type      | Purpose                      | Example                  |
|-------------|-----------|------------------------------|--------------------------|
| `delay`     | ms        | Artificial latency           | `?delay=3000`            |
| `status`    | HTTP code | Simulate HTTP errors         | `?status=500`            |
| `size`      | integer   | Payload size (KB)            | `?size=500`              |
| `errorType` | string    | Semantic error type          | `?errorType=db`          |

### Error Types

- `db` - Database connection timeout
- `auth` - Unauthorized access

## 📊 API Examples

### Success Response
```bash
curl https://your-site.pages.dev/api/test
```

### Simulating Latency
```bash
curl https://your-site.pages.dev/api/test?delay=3000
```

### Simulating 500 Error
```bash
curl https://your-site.pages.dev/api/test?status=500
```

### Simulating Database Error
```bash
curl https://your-site.pages.dev/api/test?status=500&errorType=db
```

### Large Payload
```bash
curl https://your-site.pages.dev/api/test?size=500
```

### Combined Scenario
```bash
curl https://your-site.pages.dev/api/test?delay=2000&status=503&errorType=db&size=100
```

## 🧪 Test Scenarios

### DB Bottleneck
```
/api/test?delay=2000
```

### Infrastructure Crash
```
/api/test?status=500
```

### Authentication Failure
```
/api/test?status=401&errorType=auth
```

### Large Payload Latency
```
/api/test?size=1000
```

### Mixed Load Pattern
Generate traffic with:
- 70% success (200)
- 20% latency (delay=1000-3000ms)
- 10% errors (500)

## 📈 Browser Performance Testing

### Main Page (`/`)
- Measures LCP with single large image
- API call button for interaction testing
- Lightweight for baseline metrics

### Large Page (`/large.html`)
- Multiple large images for LCP regression
- Slow and fast API buttons
- Real-time duration display

## 🔧 Local Development

### Prerequisites
```bash
npm install -g wrangler
```

### Local Testing
```bash
wrangler pages dev public --compatibility-date=2024-01-01
```

Access at: `http://localhost:8788`

## 🌐 Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for complete deployment instructions.

Quick deploy to Cloudflare Pages:

1. Push to GitHub
2. Connect repo in Cloudflare Dashboard
3. Set build output: `public`
4. Deploy

## 🎯 RCA Signal Mapping

| Behavior                | Expected RCA          |
|-------------------------|----------------------|
| `delay` ↑              | Backend latency      |
| `status=500` spike     | Infrastructure failure|
| `status=401` spike     | Functional auth issue|
| Large payload + LCP ↑  | Frontend regression  |

## ✅ Validation Checklist

Before load testing:

- [ ] Public URL accessible
- [ ] 200 response works
- [ ] 500 response works
- [ ] `delay` parameter works
- [ ] `size` parameter works
- [ ] Browser page loads correctly
- [ ] No caching (check headers)
- [ ] Images load properly

## 🚫 What This Is NOT

- ❌ Not a real backend
- ❌ No database required
- ❌ No authentication system
- ❌ No external dependencies
- ❌ No random behavior (deterministic only)

## 📝 Technical Constraints

- Cloudflare Pages + Functions only
- No Node.js server
- No external APIs
- No database
- Free tier compatible
- Public URL

## 🔮 Future Enhancements (Phase 2)

Potential additions:
- Random failure rate parameter
- CPU-intensive operations
- Memory load simulation
- Edge region routing

## 📄 License

Private project for load testing purposes.

## 🤝 Contributing

This is a controlled testing environment. Changes should maintain deterministic behavior.

---

**Note**: This SUT is designed for reliability and reproducibility in load testing scenarios.

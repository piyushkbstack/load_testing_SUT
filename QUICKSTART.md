# 🚀 Quick Start Guide

Get your RCA Mock Site up and running in 5 minutes.

## Prerequisites

- ✅ Git installed
- ✅ Cloudflare account (free)
- ✅ GitHub account

## 📋 Steps

### 1️⃣ Verify Local Setup

```bash
# Navigate to project
cd /Users/piyushkumar/Work_Repo/load_sut_project

# Check structure
ls -la

# You should see:
# - package.json
# - wrangler.toml
# - public/
# - functions/
# - README.md
# - DEPLOYMENT.md
```

### 2️⃣ Test Locally (Optional)

Install Wrangler:
```bash
npm install -g wrangler
```

Start local dev server:
```bash
wrangler pages dev public --compatibility-date=2024-01-01
```

Validate locally:
```bash
# In another terminal
./validate.sh http://localhost:8788
```

Press `Ctrl+C` to stop the dev server.

### 3️⃣ Push to GitHub

```bash
# Initialize git (if not done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: RCA Mock Site"

# Add your GitHub remote
git remote add origin https://github.com/piyushkbstack/load_testing_SUT.git

# Push
git branch -M main
git push -u origin main
```

### 4️⃣ Deploy to Cloudflare Pages

1. Go to: https://dash.cloudflare.com/
2. Navigate to **Pages** → **Create a project**
3. Click **Connect to Git**
4. Select your repository: `load_testing_SUT`
5. Configure:
   - **Project name**: `rca-mock-site` (or your choice)
   - **Production branch**: `main`
   - **Framework preset**: None
   - **Build command**: (leave empty)
   - **Build output directory**: `public`
6. Click **Save and Deploy**
7. Wait ~1 minute for deployment

You'll get: `https://rca-mock-site.pages.dev` (or your-chosen-name)

### 5️⃣ Validate Deployment

```bash
# Replace with your actual URL
export SITE_URL="https://rca-mock-site.pages.dev"

# Run validation
./validate.sh $SITE_URL
```

Expected output:
```
================================================
  RCA Mock Site - Validation Tests
================================================

Testing site: https://rca-mock-site.pages.dev

Testing: Basic API call ... ✓ PASS (Status: 200)
Testing: 500 Error simulation ... ✓ PASS (Status: 500)
...
================================================
  Test Results
================================================
Passed: 10
Failed: 0
Total:  10

✓ All tests passed! Site is ready for load testing.
```

### 6️⃣ Test Live Endpoints

```bash
# Test basic endpoint
curl $SITE_URL/api/test

# Test with latency
curl $SITE_URL/api/test?delay=2000

# Test error simulation
curl $SITE_URL/api/test?status=500&errorType=db

# Test large payload
curl $SITE_URL/api/test?size=100
```

### 7️⃣ Test in Browser

Open in browser:
```bash
open $SITE_URL
open $SITE_URL/large.html
```

Test the "Call API" button and check browser console.

---

## 🎯 What's Next?

### Configure Your Load Testing Tool

Use your deployed URL in your load testing configuration:

**Example for K6**:
```javascript
export let options = {
  stages: [
    { duration: '2m', target: 100 },
  ],
};

export default function () {
  http.get('https://rca-mock-site.pages.dev/api/test');
}
```

**Example for JMeter**:
- Server: `rca-mock-site.pages.dev`
- Protocol: `https`
- Path: `/api/test`

**Example for Artillery**:
```yaml
config:
  target: "https://rca-mock-site.pages.dev"
```

### Review Test Scenarios

See [TEST_SCENARIOS.md](TEST_SCENARIOS.md) for comprehensive test patterns.

### Start Load Testing

1. Run your first load test with 70/20/10 pattern:
   - 70% success: `/api/test`
   - 20% slow: `/api/test?delay=2000`
   - 10% errors: `/api/test?status=500`

2. Collect metrics (latency, error rate, throughput)

3. Feed to RCA agent

4. Validate RCA output

---

## 🔍 API Reference

| Endpoint | Parameters | Purpose |
|----------|------------|---------|
| `/api/test` | - | Basic success |
| `/api/test?delay=X` | X = milliseconds | Add latency |
| `/api/test?status=X` | X = HTTP code | Simulate errors |
| `/api/test?size=X` | X = KB | Large payload |
| `/api/test?errorType=X` | X = db\|auth | Error context |

**Combine parameters**:
```
/api/test?delay=2000&status=503&errorType=db&size=100
```

---

## 📊 Quick Test Matrix

| Scenario | URL | Expected RCA |
|----------|-----|--------------|
| DB Slow | `/api/test?delay=2000&errorType=db` | Backend/DB |
| Crash | `/api/test?status=500` | Infrastructure |
| Auth Fail | `/api/test?status=401&errorType=auth` | Functional |
| Large Data | `/api/test?size=1000` | Backend/Frontend |

---

## ⚡ Pro Tips

1. **No Caching**: All responses have `Cache-Control: no-store`
2. **Deterministic**: Same inputs = same outputs
3. **Global CDN**: Cloudflare serves from edge (low latency)
4. **Free Tier**: Handles thousands of requests/second
5. **HTTPS**: Automatic SSL/TLS
6. **Zero Config**: No environment variables needed

---

## 🐛 Troubleshooting

**Issue**: `validate.sh` fails locally
- **Solution**: Ensure Wrangler dev server is running on port 8788

**Issue**: API returns 404 in production
- **Solution**: Check Functions are deployed (Cloudflare Dashboard → Pages → Functions)

**Issue**: Images don't load
- **Solution**: Verify `public/assets/large-image.jpg` exists and was deployed

**Issue**: CORS errors from browser
- **Solution**: Add CORS headers in `functions/api/[[route]].js` if needed

---

## 📚 Documentation

- [README.md](README.md) - Full project documentation
- [DEPLOYMENT.md](DEPLOYMENT.md) - Detailed deployment guide
- [TEST_SCENARIOS.md](TEST_SCENARIOS.md) - Load testing patterns
- [validate.sh](validate.sh) - Automated validation script

---

## ✅ Success Checklist

- [ ] Project structure created
- [ ] Git repository initialized
- [ ] Pushed to GitHub
- [ ] Deployed to Cloudflare Pages
- [ ] Public URL accessible
- [ ] All validation tests pass
- [ ] API endpoints respond correctly
- [ ] Browser pages load
- [ ] Ready for load testing

---

**You're all set!** 🎉

Your RCA Mock Site is now live and ready for load testing and RCA validation.

**Next Step**: Run your first load test using scenarios from [TEST_SCENARIOS.md](TEST_SCENARIOS.md)

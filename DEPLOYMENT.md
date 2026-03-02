# 🚀 Deployment Guide

This guide covers deploying the RCA Mock Site to Cloudflare Pages.

## Prerequisites

✅ GitHub account  
✅ Cloudflare account (free tier works)  
✅ Git repository pushed to GitHub

---

## 📦 Step 1: Push to GitHub

If not already done:

```bash
cd /Users/piyushkumar/Work_Repo/load_sut_project

# Initialize git (if not done)
git init
git add .
git commit -m "Initial commit: RCA Mock Site SUT"

# Add remote and push
git remote add origin https://github.com/YOUR_USERNAME/load_testing_SUT.git
git branch -M main
git push -u origin main
```

---

## ☁️ Step 2: Deploy to Cloudflare Pages

### Via Cloudflare Dashboard (Recommended)

1. **Login to Cloudflare**
   - Go to https://dash.cloudflare.com
   - Navigate to **Pages**

2. **Create New Project**
   - Click **"Create a project"**
   - Select **"Connect to Git"**

3. **Connect GitHub Repository**
   - Authorize Cloudflare to access your GitHub
   - Select: `load_testing_SUT` (or your repo name)
   - Click **"Begin setup"**

4. **Configure Build Settings**
   ```
   Project name: load-testing-sut (or your choice)
   Production branch: main
   Framework preset: None
   Build command: (leave empty)
   Build output directory: public
   ```

5. **Environment Variables**
   - None required for this project

6. **Deploy**
   - Click **"Save and Deploy"**
   - Wait 1-2 minutes for deployment

7. **Get Your URL**
   - You'll receive: `https://load-testing-sut.pages.dev`
   - Or custom: `https://your-project-name.pages.dev`

---

## 🧪 Step 3: Verify Deployment

### Test API Endpoint

```bash
# Replace with your actual URL
export SITE_URL="https://load-testing-sut.pages.dev"

# Test 1: Basic success
curl $SITE_URL/api/test

# Test 2: Latency
curl $SITE_URL/api/test?delay=2000

# Test 3: Error simulation
curl $SITE_URL/api/test?status=500

# Test 4: Large payload
curl $SITE_URL/api/test?size=100

# Test 5: Combined
curl $SITE_URL/api/test?delay=1000&status=503&errorType=db
```

### Test Browser Pages

```bash
# Open in browser
open $SITE_URL
open $SITE_URL/large.html
```

### Check Response Headers

```bash
curl -I $SITE_URL/api/test
```

Expected headers:
```
Content-Type: application/json
Cache-Control: no-store
```

---

## 🔄 Step 4: Continuous Deployment

Cloudflare Pages automatically deploys on git push:

```bash
# Make changes
git add .
git commit -m "Update API logic"
git push

# Cloudflare automatically:
# 1. Detects push
# 2. Builds project
# 3. Deploys new version
# 4. Updates live site (~1 minute)
```

---

## 🛠️ Alternative: Deploy via Wrangler CLI

### Install Wrangler

```bash
npm install -g wrangler
```

### Authenticate

```bash
wrangler login
```

### Deploy

```bash
cd /Users/piyushkumar/Work_Repo/load_sut_project
wrangler pages deploy public --project-name=load-testing-sut
```

### Output

```
✨ Successfully deployed!
🌍 https://load-testing-sut.pages.dev
```

---

## 📊 Step 5: Monitor Deployment

### View Logs

1. Go to Cloudflare Dashboard
2. Pages → Your Project
3. View **Deployments**
4. Click on latest deployment
5. See build logs and live site

### Analytics

Cloudflare Pages provides:
- Page views
- Request counts
- Bandwidth usage
- Geographic distribution

---

## 🔧 Troubleshooting

### Issue: Functions not working

**Solution**: Ensure `wrangler.toml` has:
```toml
pages_build_output_dir = "public"
```

### Issue: 404 on API routes

**Solution**: Check that `/functions/api/[[route]].js` exists and has correct path.

### Issue: Images not loading

**Solution**: Verify `public/assets/large-image.jpg` exists:
```bash
ls -lh public/assets/
```

### Issue: CORS errors

**Solution**: Add CORS headers in `[[route]].js`:
```javascript
headers: {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
  "Access-Control-Allow-Origin": "*"
}
```

---

## 🌐 Custom Domain (Optional)

### Add Custom Domain

1. Go to Cloudflare Dashboard
2. Pages → Your Project → Custom domains
3. Click **"Set up a custom domain"**
4. Enter your domain: `mock.yourdomain.com`
5. Cloudflare automatically configures DNS

### Update DNS

If domain is not on Cloudflare:
```
Type: CNAME
Name: mock
Value: load-testing-sut.pages.dev
```

---

## 🔐 Security Considerations

### Current Setup
- ✅ Public endpoints (as designed)
- ✅ No authentication needed
- ✅ No sensitive data
- ✅ HTTPS by default

### If Adding Authentication Later
- Use Cloudflare Access
- Or implement API keys in headers
- Add rate limiting

---

## 📈 Performance Optimization

### Already Optimized
- ✅ Static assets via CDN
- ✅ Edge functions (low latency)
- ✅ No database queries
- ✅ Cache-Control headers set

### Load Testing Ready
The site can handle:
- Thousands of requests per second
- Global edge distribution
- Zero cold starts (Functions)

---

## ✅ Post-Deployment Checklist

- [ ] Site accessible via public URL
- [ ] API `/api/test` returns 200
- [ ] Delay parameter works (`?delay=1000`)
- [ ] Status codes work (`?status=500`)
- [ ] Error types work (`?errorType=db`)
- [ ] Size parameter works (`?size=100`)
- [ ] Main page loads with image
- [ ] Large page loads correctly
- [ ] No console errors in browser
- [ ] Cache-Control header present

---

## 🎯 Next Steps

1. **Save your deployment URL**
   ```bash
   echo "https://load-testing-sut.pages.dev" > DEPLOYMENT_URL.txt
   ```

2. **Configure load testing tool**
   - Use deployment URL as target
   - Set up test scenarios from README.md

3. **Monitor during testing**
   - Watch Cloudflare Analytics
   - Check response times
   - Verify error rates

---

## 📞 Support

**Cloudflare Pages Docs**: https://developers.cloudflare.com/pages/  
**Cloudflare Functions Docs**: https://developers.cloudflare.com/pages/functions/

---

Deployment complete! 🎉 Your SUT is now live and ready for load testing.

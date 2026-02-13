# Cloudflare Pages Deployment Fix

## Problem
Getting 404 errors on all endpoints when deployed to Cloudflare Pages.

## Root Cause
Cloudflare Pages Functions requires specific file patterns and routing configuration.

## Solutions Applied

### 1. Added `_routes.json`
Created `/public/_routes.json` to explicitly route `/api/*` to Functions:
```json
{
  "version": 1,
  "include": ["/api/*"],
  "exclude": []
}
```

### 2. Updated Function Filename
Cloudflare Pages supports these patterns:
- `[...path].js` - Catch-all (recommended)
- `[[route]].js` - Double bracket catch-all (may have issues)

Created `/functions/api/[...path].js` as the primary handler.

### 3. Ensure Correct Deployment Settings

In Cloudflare Dashboard:
```
Build command: (leave empty)
Build output directory: public
Root directory: /
```

### 4. Verify File Structure

Your deployed structure should be:
```
/
├── functions/
│   └── api/
│       ├── [[route]].js
│       ├── [...path].js  ← New catch-all
│       └── handler.cjs   (dev only, not deployed)
├── public/
│   ├── _routes.json      ← New routing config
│   ├── index.html
│   ├── large.html
│   └── assets/
├── wrangler.toml
└── dev-server.js (dev only)
```

## How to Redeploy

### Option 1: Git Push (Automatic)
```bash
git add .
git commit -m "Fix Cloudflare Pages routing for Functions"
git push
```

Cloudflare automatically redeploys on push.

### Option 2: Manual Wrangler Deploy
```bash
# Install wrangler (requires Node 20+)
npm install -g wrangler

# Deploy
wrangler pages deploy public --project-name=rca-mock-site
```

### Option 3: Dashboard Manual Upload
1. Go to Cloudflare Dashboard → Pages
2. Click on your project
3. Go to "Deployments"
4. Click "Upload assets"
5. Upload the entire project

## Validation After Deployment

Wait 1-2 minutes after deployment, then:

```bash
# Replace with your actual URL
export SITE_URL="https://your-project.pages.dev"

# Quick test
curl $SITE_URL/api/test

# Full validation
./validate.sh $SITE_URL
```

## Expected Results

All tests should pass:
```
Testing: Basic API call ... ✓ PASS (Status: 200)
Testing: 500 Error simulation ... ✓ PASS (Status: 500)
Testing: 404 Error simulation ... ✓ PASS (Status: 404)
Testing: 401 Auth error ... ✓ PASS (Status: 401)
Testing: 503 DB error ... ✓ PASS (Status: 503)
Testing: Artificial delay (2s) ... ✓ PASS (Took 2s)
Testing: Large payload (100KB) ... ✓ PASS (Size: 100107 bytes)
Testing: Response headers ... ✓ PASS
Testing: Homepage (/) ... ✓ PASS
Testing: Large page (/large.html) ... ✓ PASS
```

## Troubleshooting

### Still Getting 404?

**Check Functions are deployed:**
1. Cloudflare Dashboard → Pages → Your Project
2. Click "Functions" tab
3. Verify you see `/api/[...path]` or `/api/[[route]]`

**Check Build Logs:**
1. Go to "Deployments"
2. Click latest deployment
3. View "Build log"
4. Look for: "✨ Compiled Worker successfully"

**Check _routes.json deployed:**
```bash
curl https://your-site.pages.dev/_routes.json
```

Should return the routing config (not 404).

**Verify compatibility date:**
In `wrangler.toml`, ensure:
```toml
compatibility_date = "2024-01-01"
```

### Functions Not Showing Up?

The `/functions` directory MUST be at the project root, not inside `/public`.

Correct structure:
```
/your-project/
├── functions/  ← Here, at root
└── public/
```

Wrong:
```
/your-project/
└── public/
    └── functions/  ← Not here!
```

### API Calls Work but Static Pages Don't?

Check that `/public` contains:
- `index.html`
- `large.html`
- `assets/large-image.jpg`

### Headers Not Showing?

The `Cache-Control: no-store` header is set in the API handler. Verify with:
```bash
curl -I https://your-site.pages.dev/api/test
```

## Common Cloudflare Pages Gotchas

1. **Functions directory must be at root** - Not in public/
2. **Use `_routes.json` for explicit routing** - Prevents routing conflicts
3. **Catch-all patterns** - `[...path].js` is more reliable than `[[route]].js`
4. **Build output** - Must be `public` (not `dist` or other)
5. **Compatibility date** - Must be 2021 or later for modern APIs

## Need More Help?

1. Check Cloudflare Pages docs: https://developers.cloudflare.com/pages/functions/
2. View deployment logs in Cloudflare Dashboard
3. Test locally first: `node dev-server.js` then `./validate.sh`

---

After applying these fixes and redeploying, your site should work correctly! ✅

# Load Test SUT - AI Coding Agent Instructions

## Project Purpose
This is a **System Under Test (SUT)** designed specifically for validating load testing tools (k6, JMeter) and browser automation frameworks (Playwright, Selenium). It provides controlled endpoints that produce predictable performance metrics.

## Architecture Overview

```
server.js          → Express app entry point, mounts routers
utils.js           → Shared utilities (auth, delays, HTML templates, session store)
routes/
  ├── apiRoutes.js → API endpoints for load testing (controlled latency/errors)
  └── uiRoutes.js  → Login, dashboard, and UI metric control pages
```

**Key Design Decision**: All routes are modularized in separate routers and mounted in `server.js`. UI routes are mounted first to prevent API routes from shadowing them.

## Session & Auth Pattern

- **In-memory sessions**: `sessions` object in `utils.js` stores `{sessionId: {userId, timestamp}}`
- **Cookie-based auth**: `sessionId` cookie set on successful login, validated by `checkAuth` middleware
- **Dummy credentials**: `DUMMY_USERNAME='testuser'`, `DUMMY_PASSWORD='password'` (constants in `utils.js`)
- **Auth middleware behavior**: 
  - UI paths (`/ui/*`, `/dashboard`) → redirect to `/login`
  - API paths → return 401 JSON response

## Controlled Metric Endpoints

### API Routes (for k6/JMeter)
All API routes require authentication and are prefixed with `/api/control/*`:

- **Latency control**:
  - `/api/control/latency/avg` - Fixed 500ms delay (for avg RT/TTFB testing)
  - `/api/control/latency/p99-outlier` - 1% requests @ 5s, 99% @ 200ms (percentile testing)
  - `/api/control/latency/threshold` - 3.5s delay (slow endpoint flagging)

- **Error code coverage**:
  - `/api/control/error/success` - 200 OK (success rate testing)
  - `/api/control/error/redirect-temp` - 307 redirect (3xx tracking)
  - `/api/control/error/client-fail` - 401 Unauthorized (4xx tracking)
  - `/api/control/error/server-fail` - 503 Service Unavailable (5xx tracking)

### UI Routes (for Playwright/Selenium)
All UI metric pages require authentication:

- `/ui/zero/cls` - Zero Cumulative Layout Shift (stable layout)
- `/ui/zero/inp` - Minimum Interaction to Next Paint (fast button click)
- `/ui/high/cls` - Forced layout shift after 4s (high CLS score)
- `/ui/high/lcp` - 3s delayed image load (high Largest Contentful Paint)

## Development Workflow

**Start server**: `npm start` (runs on port 3000)
**Entry point**: http://localhost:3000 redirects to `/login`

**No test suite exists** - this is a controlled SUT, not a production app.

## HTML Rendering Pattern

All UI pages use `getBaseHtml(title, bodyContent)` helper from `utils.js`:
- Returns complete HTML string with embedded CSS
- Consistent styling across all pages (card-based layout, color-coded test links)
- IDs on interactive elements for test automation (e.g., `#login-submit-btn`, `#api-latency-avg`)

## Convention: Adding New Controlled Endpoints

1. **API endpoint**: Add to `routes/apiRoutes.js` under `/api/control/*` prefix
2. **UI page**: Add to `routes/uiRoutes.js` under `/ui/*` prefix
3. **Use `delay(ms)` utility** for latency control (imported from `utils.js`)
4. **Include IDs** on clickable elements for automation: `id="descriptive-action-btn"`
5. **Add dashboard link**: Update `/dashboard` route in `uiRoutes.js` grid section

## External Dependencies

- **Express 4.18.2**: Core web framework
- **body-parser 1.20.2**: Parses POST request bodies (login form)
- **External image**: `/ui/high/lcp` loads from `https://picsum.photos/1000/600`

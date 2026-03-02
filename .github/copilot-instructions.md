Perfect 👌
Below is a **production-ready `INSTRUCTIONS.md`** you can paste into your repo and use directly with Copilot.

It is written to:

* Avoid hallucination
* Be explicit about file structure
* Be explicit about code
* Define exact expected behavior
* Prevent ambiguity
* Support your RCA testing use case

---

# 📄 INSTRUCTIONS.md

## Cloudflare Pages + Functions Mock Website for Load & RCA Testing

---

# 1️⃣ Objective

Create a **public mock website** using:

* Cloudflare Pages
* Cloudflare Pages Functions (serverless)
* No external database
* No external dependencies

This website will:

* Expose controlled API endpoints
* Allow deterministic HTTP status control
* Allow artificial latency injection
* Allow payload size control
* Expose browser performance metrics (LCP, INP, FCP, TTFB)
* Be stable under load testing
* Be usable for RCA validation

This is NOT a real backend.
This is a deterministic mock API for load testing and RCA validation.

---

# 2️⃣ Technical Constraints

* Must be deployable on Cloudflare Pages
* Must not require Node server
* Must not require database
* Must not require third-party APIs
* Must work on free tier
* Must be public URL

---

# 3️⃣ Repository Structure (IMPORTANT – DO NOT CHANGE)

Create exactly this structure:

```
/ (repo root)
│
├── package.json
├── wrangler.toml
│
├── /public
│   ├── index.html
│   ├── large.html
│   └── assets/
│       └── large-image.jpg
│
└── /functions
    └── api
        └── [[route]].js
```

Do NOT add extra folders.

---

# 4️⃣ package.json

Create this exact file:

```json
{
  "name": "load-testing-sut",
  "version": "1.0.0",
  "private": true
}
```

No dependencies required.

---

# 5️⃣ wrangler.toml

Create this file at root:

```toml
name = "load-testing-sut"
compatibility_date = "2024-01-01"
pages_build_output_dir = "public"
```

---

# 6️⃣ API Implementation (Core Logic)

Create:

```
/functions/api/[[route]].js
```

Paste this exact code:

```javascript
export async function onRequest(context) {
  const request = context.request;
  const url = new URL(request.url);
  const path = url.pathname;

  const delay = parseInt(url.searchParams.get("delay")) || 0;
  const status = parseInt(url.searchParams.get("status")) || 200;
  const size = parseInt(url.searchParams.get("size")) || 1;
  const errorType = url.searchParams.get("errorType") || null;

  if (delay > 0) {
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  let payload = {
    success: status < 400,
    timestamp: Date.now(),
    route: path,
    message: "Mock API response"
  };

  if (errorType === "db") {
    payload.message = "Database connection timeout";
  }

  if (errorType === "auth") {
    payload.message = "Unauthorized access";
  }

  if (size > 1) {
    payload.largeData = "x".repeat(size * 1000);
  }

  return new Response(JSON.stringify(payload), {
    status: status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }
  });
}
```

---

# 7️⃣ Supported Query Parameters

Your API must support:

| Parameter | Type      | Purpose                 |
| --------- | --------- | ----------------------- |
| delay     | ms        | Artificial latency      |
| status    | HTTP code | Simulate errors         |
| size      | integer   | Payload size multiplier |
| errorType | string    | Semantic error type     |

---

# 8️⃣ Example URLs

Simulate success:

```
/api/test
```

Simulate latency:

```
/api/test?delay=3000
```

Simulate 500 error:

```
/api/test?status=500
```

Simulate DB error:

```
/api/test?status=500&errorType=db
```

Simulate large payload:

```
/api/test?size=500
```

---

# 9️⃣ Frontend Page for Browser Metrics

Create:

```
/public/index.html
```

Paste:

```html
<!DOCTYPE html>
<html>
<head>
  <title>RCA Mock Site</title>
</head>
<body>
  <h1>RCA Mock Site</h1>
  <img src="/assets/large-image.jpg" width="1200" />
  <button onclick="callApi()">Call API</button>

  <script>
    function callApi() {
      fetch('/api/test?delay=1000')
        .then(res => res.json())
        .then(data => console.log(data));
    }
  </script>
</body>
</html>
```

This ensures:

* LCP measured
* INP measurable
* TTFB measurable
* API call triggered

---

# 🔟 Large Page for Stress Testing

Create:

```
/public/large.html
```

Add multiple large images to create LCP regression testing.

---

# 1️⃣1️⃣ Cloudflare Deployment Steps

1. Push repo to GitHub
2. Go to Cloudflare Dashboard
3. Pages → Create Project
4. Connect GitHub repo
5. Framework preset: None
6. Build command: (leave empty)
7. Build output directory: public
8. Deploy

You will get:

```
https://<project>.pages.dev
```

---

# 1️⃣2️⃣ Test Matrix for Load Tool

Use these patterns to generate RCA scenarios:

## DB Bottleneck

```
/api/test?delay=2000
```

## 5xx Crash

```
/api/test?status=500
```

## Auth Failure

```
/api/test?status=401&errorType=auth
```

## Large Payload Latency

```
/api/test?size=1000
```

## Mixed Scenario

Randomly combine:

* 70% success
* 20% delay
* 10% 500

---

# 1️⃣3️⃣ Expected RCA Signal Mapping

| Behavior              | Expected RCA          |
| --------------------- | --------------------- |
| delay ↑               | Backend latency       |
| status=500 spike      | Infra failure         |
| status=401 spike      | Functional auth issue |
| large payload + LCP ↑ | Frontend regression   |

---

# 1️⃣4️⃣ What NOT To Do

Do NOT:

* Add database
* Add authentication
* Add environment variables
* Add random behavior
* Add third-party SDK
* Use Express
* Add Node server
* Use Vercel or Netlify for this version

Keep it deterministic.

---

# 1️⃣5️⃣ Validation Checklist

Before using for load testing:

* [ ] Public URL accessible
* [ ] 200 response works
* [ ] 500 response works
* [ ] delay works
* [ ] size works
* [ ] Browser page loads correctly
* [ ] No caching (check headers)

---

# 1️⃣6️⃣ Future Enhancements (Phase 2)

Later you may:

* Add random failure rate parameter
* Add CPU-intensive function
* Add artificial memory load
* Add edge region routing logic

Do NOT implement in Phase 1.

---

# 1️⃣7️⃣ Final Goal

This website must:

* Produce controlled signals
* Be reproducible
* Be deterministic
* Be simple
* Be reliable for load testing
* Be usable for RCA validation datasets

---

If you'd like, I can now also give you:

* A ready-made load test scenario matrix for this site
* A dataset generation script
* Or a CI automation template for validating RCA agent automatically

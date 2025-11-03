const express = require('express');
const { getBaseHtml, DUMMY_USERNAME, DUMMY_PASSWORD, sessions, generateSessionId, checkAuth } = require('../utils');

const router = express.Router();

// ** Login Page (GET) **
router.get('/login', (req, res) => {
    const loginHtml = `
        <div class="card" style="max-width: 400px; margin: 40px auto; text-align: center;">
            <h2>SDET Login</h2>
            <form action="/login" method="POST">
                <div class="form-group">
                    <label for="username-input">Username (${DUMMY_USERNAME})</label>
                    <input type="text" id="username-input" name="username" value="${DUMMY_USERNAME}" required>
                </div>
                <div class="form-group">
                    <label for="password-input">Password (${DUMMY_PASSWORD})</label>
                    <input type="password" id="password-input" name="password" value="${DUMMY_PASSWORD}" required>
                </div>
                <button type="submit" id="login-submit-btn" class="btn-primary">Log In</button>
            </form>
            <p style="margin-top: 15px;"><small>Use dummy credentials for load testing.</small></p>
        </div>
    `;
    res.send(getBaseHtml('Login', loginHtml));
});

// ** Login Endpoint (POST) **
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (username === DUMMY_USERNAME && password === DUMMY_PASSWORD) {
        const sessionId = generateSessionId();
        sessions[sessionId] = { userId: DUMMY_USERNAME, timestamp: Date.now() };

        res.setHeader('Set-Cookie', `sessionId=${sessionId}; HttpOnly; Max-Age=3600; Path=/`);
        return res.redirect('/dashboard');
    }

    const errorHtml = `
        <div class="card danger" style="max-width: 400px; margin: 40px auto; text-align: center;">
            <p>Login failed. Please check credentials.</p>
            <p><a href="/login" id="try-again-link" class="test-link danger">Try Again</a></p>
        </div>
    `;
    res.status(401).send(getBaseHtml('Login Failed', errorHtml)); 
});

// ** Dashboard Page (Requires Auth) **
router.get('/dashboard', checkAuth, (req, res) => {
    const dashboardHtml = `
        <h2>API Metric Control Endpoints (For k6 / JMeter)</h2>
        <div class="grid">
            <a href="/api/control/latency/avg" id="api-latency-avg" class="test-link success">
                <strong>/api/latency/avg (500ms)</strong><br>Test Avg RT & TTFB.
            </a>
            <a href="/api/control/latency/p99-outlier" id="api-latency-p99-outlier" class="test-link warning">
                <strong>/api/latency/p99 (1% @ 5s)</strong><br>Validate P99/P95 percentile calculation.
            </a>
            <a href="/api/control/latency/threshold" id="api-latency-threshold" class="test-link danger">
                <strong>/api/latency/threshold (3.5s)</strong><br>Test Slow Endpoint Flagging.
            </a>
            <a href="/api/control/error/success" id="api-error-success" class="test-link success">
                <strong>/api/error/success (200 OK)</strong><br>Target for 2xx Count / Zero Error Rate.
            </a>
            <a href="/api/control/error/client-fail" id="api-error-4xx" class="test-link danger">
                <strong>/api/error/client-fail (401)</strong><br>Test 4xx Count Tracking.
            </a>
            <a href="/api/control/error/server-fail" id="api-error-5xx" class="test-link danger">
                <strong>/api/error/server-fail (503)</strong><br>Test 5xx Count Tracking.
            </a>
            <a href="/api/control/error/redirect-temp" id="api-error-3xx" class="test-link warning">
                <strong>/api/error/redirect (307)</strong><br>Test 3xx Count Tracking.
            </a>
            <a href="/api/zero/errors" id="api-zero-errors" class="test-link success">
                <strong>/api/zero/errors (Clean Run)</strong><br>Target for Zero 4xx/5xx Reporting.
            </a>
        </div>

        <h2>UI Metric Control Pages (For Playwright / Selenium)</h2>
        <div class="grid">
            <a href="/ui/zero/cls" id="ui-zero-cls" class="test-link success">
                <strong>UI: Zero CLS Page</strong><br>Validate CLS Score is 0.0.
            </a>
            <a href="/ui/zero/inp" id="ui-minimum-inp" class="test-link info">
                <strong>UI: Minimum INP Page</strong><br>Validate Fast Interaction Responsiveness.
            </a>
            <a href="/ui/high/cls" id="ui-high-cls" class="test-link danger">
                <strong>UI: High CLS Shift Page</strong><br>Force unexpected layout shift.
            </a>
            <a href="/ui/high/lcp" id="ui-high-lcp" class="test-link warning">
                <strong>UI: High LCP Page (3s Delay)</strong><br>Force slow page load/Largest Contentful Paint.
            </a>
        </div>
        <p style="text-align: center; margin-top: 40px;"><a href="/logout" id="logout-btn" class="test-link info" style="max-width: 200px; margin: 0 auto;">Logout</a></p>
    `;
    res.send(getBaseHtml('Metric Control Dashboard', dashboardHtml));
});

// ** Logout Endpoint **
router.get('/logout', (req, res) => {
    // Clear the cookie.
    res.setHeader('Set-Cookie', `sessionId=; HttpOnly; Max-Age=0; Path=/`);
    res.redirect('/login');
});


// --- UI Control Pages ---

// Target: CLS: 0.0, FCP/LCP: Minimum
router.get('/ui/zero/cls', checkAuth, (req, res) => {
    const html = getBaseHtml('Zero CLS Page', 
        `<div class="card success">
            <h2 id="cls-zero-title">Layout is Stable (CLS: 0.0)</h2>
            <p>This page loads all content instantly. Your load product should report a CLS score of 0.0.</p>
            <p><a href="/dashboard" id="back-to-dashboard-btn" class="btn-primary">Back to Dashboard</a></p>
        </div>`
    );
    res.send(html);
});

// Target: INP: Minimum Value (Fast Interaction)
router.get('/ui/zero/inp', checkAuth, (req, res) => {
    const bodyContent = `
        <div class="card info">
            <h2>Minimum INP Page</h2>
            <p>Click the button to test fast interaction responsiveness (INP). The script is non-blocking.</p>
            <button id="inp-btn" class="btn-primary" style="margin-top: 15px;">Click for Fast INP Test</button>
            <div id="output" style="margin-top: 15px; font-weight: bold;"></div>
        </div>
        <script>
            document.getElementById('inp-btn').addEventListener('click', () => {
                document.getElementById('output').innerHTML = 'Interaction complete! (INP should be very low)';
            });
        </script>
    `;
    res.send(getBaseHtml('Minimum INP Page', bodyContent));
});

// Target: High CLS (Layout Shift)
router.get('/ui/high/cls', checkAuth, (req, res) => {
    const bodyContent = `
        <div class="card danger">
            <h2 id="cls-high-title">High CLS Page - Shifting Content</h2>
            <p>Wait 4 seconds. An element will load and shift the text below, forcing a high CLS score.</p>
            <div style="height: 100px; background: #eee; padding: 10px;" id="header-content">Header Content</div>
            <p id="target-text">Target text that will be shifted.</p>
            <div id="shift-target" style="height: 0; background: #ffcccb; transition: height 0.5s;"></div>
        </div>
        <script>
            // Intentional 4-second delay to cause a shift after FCP/LCP
            setTimeout(() => {
                const target = document.getElementById('shift-target');
                target.style.height = '300px'; 
                target.style.padding = '10px';
                target.innerHTML = '<h3>--- UNEXPECTED BANNER LOADED ---</h3>';
            }, 4000); 
        </script>
    `;
    res.send(getBaseHtml('High CLS Page', bodyContent));
});

// Target: High LCP (Delayed Largest Contentful Element)
router.get('/ui/high/lcp', checkAuth, (req, res) => {
    const bodyContent = `
        <div class="card warning">
            <h2 id="lcp-high-title">High LCP Page - Delayed Image</h2>
            <p>The Largest Contentful Paint (LCP) element on this page is being delayed by 3 seconds.</p>
            <div id="image-container" style="min-height: 400px; background: #e2e2e2; display: flex; align-items: center; justify-content: center;">
                <p>Loading LCP Image...</p>
            </div>
        </div>
        <script>
            setTimeout(() => {
                const img = document.createElement('img');
                img.src = 'https://picsum.photos/1000/600'; // Large image URL
                img.style.width = '100%';
                img.style.borderRadius = '8px';
                img.setAttribute('alt', 'Delayed LCP Image');
                document.getElementById('image-container').innerHTML = '';
                document.getElementById('image-container').appendChild(img);
            }, 3000); // 3-second delay on the largest element
        </script>
    `;
    res.send(getBaseHtml('High LCP Page', bodyContent));
});

module.exports = router;

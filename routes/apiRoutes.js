const express = require('express');
const { delay, checkAuth } = require('../utils'); // Import utilities

const router = express.Router();

// Use checkAuth middleware for all API routes that need protection
// Although k6/JMeter might need custom auth headers/cookies, 
// this protects the endpoints from simple browser access
router.use('/api', checkAuth); 

// --- API Control Endpoints (For JMeter/k6) ---

// ** 1. Latency and Percentile Control **

// Target: Stable P99/P95 close to 500ms
router.get('/api/control/latency/avg', async (req, res) => {
    await delay(500);
    res.status(200).json({ status: 'OK', latency: '500ms' });
});

// Target: High P99 - 1% of requests are 5 seconds (5000ms)
router.get('/api/control/latency/p99-outlier', async (req, res) => {
    const randomValue = Math.random();
    const delayTime = randomValue < 0.01 ? 5000 : 200; // 1% slow, 99% fast
    await delay(delayTime);
    res.status(200).json({ status: 'OK', delay: `${delayTime}ms` });
});

// Target: Force 'Slow Performing' flag with 3.5s response
router.get('/api/control/latency/threshold', async (req, res) => {
    await delay(3500); 
    res.status(200).json({ status: 'OK', flag: 'slow' });
});

// ** 2. Error Code Coverage **

// Target: 2xx Success Count (Zero Error API)
router.get('/api/control/error/success', (req, res) => {
    res.status(200).json({ message: 'Success (200 OK)' });
});

// Target: 3xx Redirect Count
router.get('/api/control/error/redirect-temp', (req, res) => {
    res.redirect(307, '/api/control/error/success'); 
});

// Target: 4xx Client Error Count
router.get('/api/control/error/client-fail', (req, res) => {
    res.status(401).json({ error: 'Unauthorized (401)' });
});

// Target: 5xx Server Error Count
router.get('/api/control/error/server-fail', (req, res) => {
    res.status(503).json({ error: 'Service Unavailable (503)' });
});

// Target: Zero Errors
router.get('/api/zero/errors', (req, res) => {
    res.status(200).json({ message: 'Perfect run, zero errors targeted.' });
});

module.exports = router;

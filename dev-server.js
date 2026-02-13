#!/usr/bin/env node

/**
 * Simple local dev server for RCA Mock Site
 * Works with Node.js 16+ (no Wrangler required)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 8788;
const PUBLIC_DIR = path.join(__dirname, 'public');

// Import the API handler (CommonJS version for local dev)
const apiHandler = require('./functions/api/handler.cjs');

// MIME types
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// Serve static files
function serveStatic(req, res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

// Polyfill Response for Node.js 16
if (typeof Response === 'undefined') {
  global.Response = class Response {
    constructor(body, init = {}) {
      this.body = body;
      this.status = init.status || 200;
      this.statusText = init.statusText || 'OK';
      this.headers = new Map(Object.entries(init.headers || {}));
    }

    async text() {
      return this.body;
    }

    async json() {
      return JSON.parse(this.body);
    }
  };
}

// Main request handler
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  console.log(`${req.method} ${pathname}`);

  // Handle API routes
  if (pathname.startsWith('/api/')) {
    try {
      // Create context object similar to Cloudflare Pages
      const context = {
        request: {
          url: `http://localhost:${PORT}${req.url}`,
          method: req.method,
          headers: req.headers
        }
      };

      // Call the API handler
      const response = await apiHandler.onRequest(context);
      
      // Get response body
      const body = await response.text();
      
      // Set headers
      const headers = {};
      if (response.headers instanceof Map) {
        for (const [key, value] of response.headers) {
          headers[key] = value;
        }
      } else {
        for (const [key, value] of response.headers.entries()) {
          headers[key] = value;
        }
      }
      
      res.writeHead(response.status, headers);
      res.end(body);
    } catch (error) {
      console.error('API Error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal Server Error', message: error.message }));
    }
    return;
  }

  // Serve static files
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);

  // Check if file exists
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Try adding .html
      if (!path.extname(filePath)) {
        filePath += '.html';
        fs.stat(filePath, (err2, stats2) => {
          if (err2 || !stats2.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 Not Found');
          } else {
            serveStatic(req, res, filePath);
          }
        });
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      }
    } else {
      serveStatic(req, res, filePath);
    }
  });
});

server.listen(PORT, () => {
  console.log('================================================');
  console.log('  RCA Mock Site - Development Server');
  console.log('================================================');
  console.log(`\n🚀 Server running at: http://localhost:${PORT}/`);
  console.log(`\n📁 Serving static files from: ${PUBLIC_DIR}`);
  console.log(`\n🔌 API endpoints available at: http://localhost:${PORT}/api/*`);
  console.log('\n💡 Test endpoints:');
  console.log(`   http://localhost:${PORT}/`);
  console.log(`   http://localhost:${PORT}/api/test`);
  console.log(`   http://localhost:${PORT}/api/test?delay=2000`);
  console.log(`   http://localhost:${PORT}/api/test?status=500`);
  console.log('\n✋ Press Ctrl+C to stop\n');
});

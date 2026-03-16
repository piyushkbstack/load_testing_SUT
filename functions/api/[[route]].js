export async function onRequest(context) {
  const request = context.request;
  const url = new URL(request.url);
  const path = url.pathname;

  // Query parameters
  const delay = parseInt(url.searchParams.get("delay")) || 0;
  let status = parseInt(url.searchParams.get("status")) || 200;
  const size = parseInt(url.searchParams.get("size")) || 1;
  const errorType = url.searchParams.get("errorType") || null;
  const errorRate = parseFloat(url.searchParams.get("errorRate")) || 0;
  const imageCount = parseInt(url.searchParams.get("imageCount")) || 0;
  const slowAssets = url.searchParams.get("slowAssets") === "true";

  // Random error injection
  if (errorRate > 0 && Math.random() < errorRate) {
    status = 500;
  }

  // Apply delay
  if (delay > 0) {
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  let payload = {
    success: status < 400,
    timestamp: Date.now(),
    route: path,
    message: "Mock API response",
    parameters: {
      delay,
      status,
      size,
      errorType,
      errorRate,
      imageCount,
      slowAssets
    }
  };

  // Enhanced error types
  if (errorType === "db") {
    payload.message = "Database connection timeout";
    status = 503;
  } else if (errorType === "auth") {
    payload.message = "Unauthorized access";
    status = 401;
  } else if (errorType === "rateLimit") {
    payload.message = "Too many requests";
    status = 429;
  } else if (errorType === "notFound") {
    payload.message = "Resource not found";
    status = 404;
  } else if (errorType === "badRequest") {
    payload.message = "Bad request";
    status = 400;
  } else if (errorType === "timeout") {
    payload.message = "Request timeout";
    status = 504;
  }

  // Generate image URLs if requested
  if (imageCount > 0) {
    payload.images = [];
    for (let i = 0; i < imageCount; i++) {
      payload.images.push({
        id: i + 1,
        url: `/api/test?delay=${slowAssets ? 2000 : 0}&size=${10 + i}`,
        alt: `Generated image ${i + 1}`
      });
    }
  }

  // Add large payload if requested
  if (size > 1) {
    payload.largeData = "x".repeat(size * 1000);
    payload.sizeKB = size;
  }

  // Add meta information
  payload.meta = {
    processingTime: Date.now() - payload.timestamp,
    userAgent: request.headers.get("user-agent") || "unknown",
    timestamp: new Date().toISOString()
  };

  return new Response(JSON.stringify(payload), {
    status: status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}

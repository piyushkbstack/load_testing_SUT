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

/**
 * Edge Middleware: preserve original path for /api/* so the API function
 * receives the full path after vercel.json rewrites /api/:path* -> /api.
 */
import { next } from "@vercel/functions";

export default function middleware(request) {
  const pathname = new URL(request.url).pathname;
  if (!pathname.startsWith("/api")) {
    return next();
  }
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-vercel-original-path", pathname);
  return next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: "/api/:path*",
};

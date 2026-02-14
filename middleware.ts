import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";

const GEMINI_API_RATE_LIMIT = {
  limit: 10,
  windowMs: 60 * 1000,
};

const DEFAULT_API_RATE_LIMIT = {
  limit: 120,
  windowMs: 60 * 1000,
};

const GEMINI_RATE_LIMIT_PATHS = ["/api/analyze-receipt", "/api/recipe/notify"];

const getClientIp = (request: NextRequest): string => {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const [firstIp] = forwardedFor.split(",");
    return firstIp.trim();
  }

  const realIp = request.headers.get("x-real-ip");
  return realIp?.trim() || "unknown";
};

const getUserTokenFingerprint = (request: NextRequest): string | null => {
  const authorization = request.headers.get("authorization");
  if (!authorization || !authorization.startsWith("Bearer ")) {
    return null;
  }

  const token = authorization.slice("Bearer ".length).trim();
  if (!token) return null;

  return token.slice(0, 16);
};

const isGeminiApiRoute = (pathname: string): boolean =>
  GEMINI_RATE_LIMIT_PATHS.some((path) => pathname.startsWith(path));

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = getClientIp(request);
  const tokenFingerprint = getUserTokenFingerprint(request);
  const scope = isGeminiApiRoute(pathname) ? "gemini" : "api";
  const identity = tokenFingerprint
    ? `token:${tokenFingerprint}:ip:${ip}`
    : `ip:${ip}`;

  const rule = isGeminiApiRoute(pathname)
    ? GEMINI_API_RATE_LIMIT
    : DEFAULT_API_RATE_LIMIT;

  const result = checkRateLimit(`${scope}:${pathname}:${identity}`, rule);

  if (!result.allowed) {
    return NextResponse.json(
      {
        success: false,
        error:
          "リクエスト数が上限を超えました。しばらく待ってから再試行してください。",
        retryAfter: result.retryAfter,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(result.retryAfter),
          "X-RateLimit-Limit": String(result.limit),
          "X-RateLimit-Remaining": String(result.remaining),
        },
      },
    );
  }

  const response = NextResponse.next();
  response.headers.set("X-RateLimit-Limit", String(result.limit));
  response.headers.set("X-RateLimit-Remaining", String(result.remaining));
  return response;
}

export const config = {
  matcher: ["/api/:path*"],
};

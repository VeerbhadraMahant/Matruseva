import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./types";
import { fetchWithTimeout } from "./fetch";
import { isDemoSession, isSupabaseConfigured } from "@/lib/demo";

// /offline must stay reachable with no session and no network round-trip —
// it's the PWA's offline fallback, so redirecting it anywhere defeats its purpose.
// /api/whatsapp must be public for external Meta WhatsApp Cloud API webhooks.
// /listen/<signed-token> is the mother's counselling link; the page verifies the HMAC token itself.
const PUBLIC_PATHS = ["/login", "/signup", "/auth", "/offline", "/api/whatsapp"];

/** Exact "/listen" or "/listen/..." only — never "/listening-anything". */
function isListenPath(pathname: string): boolean {
  return pathname === "/listen" || pathname.startsWith("/listen/");
}

// "/" (the marketing landing page) is also public, but it must be matched
// exactly — "/" is a prefix of every path in the app, so treating it like
// the other PUBLIC_PATHS with startsWith() would open up the entire app.

/**
 * Refreshes the Supabase session cookie on every request (required by
 * @supabase/ssr) and redirects signed-out users away from app routes.
 * Must not be skipped for any route that reads the session server-side.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  // The webhook verifies its own HMAC; skip the Supabase session round trip.
  if (request.nextUrl.pathname.startsWith("/api/whatsapp")) return response;

  // Demo bypass: only when the deployment opted in via DEMO_MODE=1.
  if (isDemoSession(request.cookies)) {
    return response;
  }

  // Fail closed: never serve the app unauthenticated because config is missing.
  if (!isSupabaseConfigured()) {
    const { pathname } = request.nextUrl;
    // Static landing page and PWA offline fallback need no auth; the webhook enforces its own checks.
    if (pathname === "/" || pathname.startsWith("/offline") || pathname.startsWith("/api/whatsapp") || isListenPath(pathname)) {
      return response;
    }
    return new NextResponse("Service unavailable: authentication is not configured.", { status: 503 });
  }

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { fetch: fetchWithTimeout() },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  // getClaims() verifies the JWT locally (ES256 JWKS, cached) and only hits
  // the Auth server when the token needs refreshing — getUser() would add a
  // network round trip to every single request, including prefetches.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims.sub;

  const isPublicPath =
    request.nextUrl.pathname === "/" ||
    isListenPath(request.nextUrl.pathname) ||
    PUBLIC_PATHS.some((path) => request.nextUrl.pathname.startsWith(path));

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return response;
}

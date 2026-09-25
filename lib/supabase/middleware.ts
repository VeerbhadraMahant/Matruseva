import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./types";

// /offline must stay reachable with no session and no network round-trip —
// it's the PWA's offline fallback, so redirecting it anywhere defeats its purpose.
const PUBLIC_PATHS = ["/login", "/signup", "/auth", "/offline"];

/**
 * Refreshes the Supabase session cookie on every request (required by
 * @supabase/ssr) and redirects signed-out users away from app routes.
 * Must not be skipped for any route that reads the session server-side.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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

  const isPublicPath = PUBLIC_PATHS.some((path) => request.nextUrl.pathname.startsWith(path));

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return response;
}

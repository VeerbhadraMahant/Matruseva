// Demo mode is an explicit, server-side opt-in (DEMO_MODE=1). It is NOT
// inferred from a client-settable cookie or from missing Supabase config:
// either of those would let anyone bypass authentication on a real deployment.
// Deliberately not prefixed NEXT_PUBLIC_ and not "server-only" so the proxy
// (middleware) can share it.

export const DEMO_COOKIE = "matrusetu_demo";
export const DEMO_EMAIL = "demo.doctor@matrusetu.test";
export const DEMO_PASSWORD = "DemoClinic123!";

export function isDemoModeEnabled(): boolean {
  return process.env.DEMO_MODE === "1";
}

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return !!url && !!key && !url.includes("xxxxxxxx") && !url.includes("your-project");
}

/**
 * True only when the deployment opted into demo mode AND either the visitor
 * signed in with the demo login (cookie) or Supabase isn't configured at all.
 * With DEMO_MODE unset this is always false, whatever cookie is sent.
 */
export function isDemoSession(cookieStore?: { get(name: string): { value?: string } | undefined }): boolean {
  if (!isDemoModeEnabled()) return false;
  return cookieStore?.get(DEMO_COOKIE)?.value === "1" || !isSupabaseConfigured();
}

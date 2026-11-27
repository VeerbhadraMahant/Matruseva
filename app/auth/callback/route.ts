import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createRecoveryProof, RECOVERY_COOKIE, RECOVERY_MAX_AGE } from "@/lib/passwordRecovery";
import { getT } from "@/lib/i18n/server";
import { DEMO_COOKIE } from "@/lib/demo";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");

  const recovery = searchParams.get("flow") === "recovery";
  if (code) {
    const supabase = await createClient();
    const flowId = searchParams.get("sb_flow_id");
    const { data, error } = await supabase.auth.exchangeCodeForSession(code, flowId ? { flowId } : undefined);
    if (!error) {
      if ("redirectType" in data && data.redirectType === "recovery") {
        const { data: verified } = await supabase.auth.getClaims(data.session.access_token);
        const sessionId = verified?.claims.session_id;
        const proof = typeof sessionId === "string" ? createRecoveryProof(sessionId) : null;
        if (proof) {
          const response = NextResponse.redirect(`${origin}/reset-password`);
          response.cookies.set(RECOVERY_COOKIE, proof, {
            httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax",
            path: "/", maxAge: RECOVERY_MAX_AGE,
          });
          return response;
        }
      } else if (!recovery) {
        const response = NextResponse.redirect(`${origin}/today`);
        // A leftover demo cookie would otherwise override this real session.
        response.cookies.delete(DEMO_COOKIE);
        return response;
      }
      return NextResponse.redirect(`${origin}/forgot-password?expired=1`);
    }
  }

  if (recovery) return NextResponse.redirect(`${origin}/forgot-password?expired=1`);
  const { t } = await getT();
  return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(t("auth.error.googleSignIn"))}`);
}

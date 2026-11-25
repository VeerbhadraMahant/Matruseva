import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");

  const recovery = searchParams.get("flow") === "recovery";
  if (code) {
    const supabase = await createClient();
    const flowId = searchParams.get("sb_flow_id");
    const { data, error } = await supabase.auth.exchangeCodeForSession(code, flowId ? { flowId } : undefined);
    if (!error) {
      const isRecovery = recovery || ("redirectType" in data && data.redirectType === "recovery");
      return NextResponse.redirect(`${origin}${isRecovery ? "/reset-password" : "/today"}`);
    }
  }

  if (recovery) return NextResponse.redirect(`${origin}/forgot-password?expired=1`);
  const { t } = await getT();
  return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(t("auth.error.googleSignIn"))}`);
}

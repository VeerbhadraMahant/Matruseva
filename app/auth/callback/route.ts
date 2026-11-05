import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}/today`);
    }
  }

  const { t } = await getT();
  return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(t("auth.error.googleSignIn"))}`);
}

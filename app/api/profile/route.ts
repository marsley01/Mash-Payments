import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getUserFromRequest } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const { data: profile, error: profileErr } = await (supabase
    .from("profiles")
    .select("id, business_name, api_token, setup_step, role, created_at")
    .eq("id", user.id)
    .maybeSingle() as unknown as Promise<{ data: any; error: unknown }>);

  if (profileErr) {
    const msg = typeof profileErr === "object" && profileErr !== null && "message" in profileErr
      ? String((profileErr as Record<string, unknown>).message)
      : "Database error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const { data: creds, error: credsErr } = await (supabase
    .from("daraja_credentials")
    .select("is_configured")
    .eq("user_id", user.id)
    .maybeSingle() as unknown as Promise<{ data: any; error: unknown }>);

  if (credsErr) {
    const msg = typeof credsErr === "object" && credsErr !== null && "message" in credsErr
      ? String((credsErr as Record<string, unknown>).message)
      : "Database error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({
    profile,
    is_configured: creds?.is_configured || false,
  });
}

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
  const { data: profile } = await (supabase
    .from("profiles")
    .select("id, business_name, api_token, setup_step, created_at")
    .eq("id", user.id)
    .maybeSingle() as unknown as Promise<{ data: any; error: unknown }>);

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const { data: creds } = await (supabase
    .from("daraja_credentials")
    .select("is_configured")
    .eq("user_id", user.id)
    .maybeSingle() as unknown as Promise<{ data: any; error: unknown }>);

  return NextResponse.json({
    profile,
    is_configured: creds?.is_configured || false,
  });
}

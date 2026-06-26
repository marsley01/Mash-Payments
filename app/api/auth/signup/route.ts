import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function generateToken(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return "mash_live_" + result;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, business_name, email, password } = body;

    if (!name || !business_name || !email || !password) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const userId = authData.user.id;
    const apiToken = generateToken();

    await supabase
      .from("profiles")
      .insert({
        id: userId,
        business_name,
        api_token: apiToken,
        setup_step: 1,
      } as never);

    await supabase
      .from("daraja_credentials")
      .insert({
        user_id: userId,
        is_configured: false,
      } as never);

    return NextResponse.json({ success: true, api_token: apiToken, email, password });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

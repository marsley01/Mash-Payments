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

    const { error: profErr } = await (supabase
      .from("profiles")
      .insert({
        id: userId,
        business_name,
        api_token: apiToken,
        setup_step: 1,
        role: "user",
      } as never) as unknown as Promise<{ error: unknown }>);
    if (profErr) {
      const msg = typeof profErr === "object" && profErr !== null && "message" in profErr
        ? String((profErr as Record<string, unknown>).message)
        : "Profile creation failed";
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    const { error: credErr } = await (supabase
      .from("daraja_credentials")
      .insert({
        user_id: userId,
        is_configured: false,
      } as never) as unknown as Promise<{ error: unknown }>);
    if (credErr) {
      const msg = typeof credErr === "object" && credErr !== null && "message" in credErr
        ? String((credErr as Record<string, unknown>).message)
        : "Credentials row creation failed";
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    return NextResponse.json({ success: true, api_token: apiToken, email, password });
  } catch (err: unknown) {
    const message = typeof err === "object" && err !== null && "message" in err
      ? String((err as Record<string, unknown>).message)
      : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

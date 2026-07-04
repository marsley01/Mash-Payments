import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

function generateToken(): string {
  const bytes = randomBytes(24);
  return "mash_live_" + bytes.toString("hex");
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!checkRateLimit("signup:" + ip, 5, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

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

    const { data: authData, error: authError } = await (supabase.auth as any).admin.createUser({
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
      return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
    }

    const { error: credErr } = await (supabase
      .from("daraja_credentials")
      .insert({
        user_id: userId,
        is_configured: false,
      } as never) as unknown as Promise<{ error: unknown }>);
    if (credErr) {
      return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
    }

    return NextResponse.json({ success: true, api_token: apiToken, email });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

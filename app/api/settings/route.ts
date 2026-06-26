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
  const { data: creds } = await (supabase
    .from("daraja_credentials")
    .select("*")
    .eq("user_id", user.id)
    .single() as unknown as Promise<{ data: any; error: unknown }>);

  if (!creds) {
    return NextResponse.json({ config: null });
  }

  const secret = creds.consumer_secret || "";
  const masked = secret.length > 6
    ? "*".repeat(secret.length - 6) + secret.slice(-6)
    : "*".repeat(secret.length);

  return NextResponse.json({
    config: { ...creds, consumer_secret: masked, full_secret: undefined },
  });
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { consumer_key, consumer_secret, passkey, shortcode, environment, callback_url } = body;

    if (!consumer_key || !consumer_secret || !passkey || !shortcode || !callback_url) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const existing = await (supabase
      .from("daraja_credentials")
      .select("id")
      .eq("user_id", user.id)
      .single() as unknown as Promise<{ data: any; error: unknown }>);

    if (existing.data) {
      await supabase
        .from("daraja_credentials")
        .update({
          consumer_key,
          consumer_secret,
          passkey,
          shortcode,
          environment: environment || "sandbox",
          callback_url,
          is_configured: true,
          updated_at: new Date().toISOString(),
        } as never)
        .eq("user_id", user.id);
    } else {
      await supabase
        .from("daraja_credentials")
        .insert({
          user_id: user.id,
          consumer_key,
          consumer_secret,
          passkey,
          shortcode,
          environment: environment || "sandbox",
          callback_url,
          is_configured: true,
        } as never);
    }

    await supabase
      .from("profiles")
      .update({ setup_step: 3 } as never)
      .eq("id", user.id)
      .lt("setup_step", 3);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

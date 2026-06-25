import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("daraja_config")
    .select("*")
    .limit(1)
    .single();

  if (error || !data) {
    return NextResponse.json({ config: null });
  }

  const secret = data.consumer_secret;
  const masked =
    secret.length > 6
      ? "*".repeat(secret.length - 6) + secret.slice(-6)
      : "*".repeat(secret.length);

  return NextResponse.json({
    config: { ...data, consumer_secret: masked },
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { consumer_key, consumer_secret, passkey, shortcode, environment, callback_url } = body;

    if (!consumer_key || !consumer_secret || !passkey || !shortcode || !callback_url) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    const supabase = getSupabase();
    const { error } = await supabase.from("daraja_config").upsert(
      {
        consumer_key,
        consumer_secret,
        passkey,
        shortcode,
        environment: environment || "sandbox",
        callback_url,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

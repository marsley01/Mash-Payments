import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getUserFromRequest } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

const SANDBOX_PASSKEY =
  process.env.SANDBOX_PASSKEY ||
  "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919";

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
    const { consumer_key, consumer_secret, environment, callback_url } = body;
    let { passkey, shortcode } = body;

    if (!consumer_key || !callback_url) {
      return NextResponse.json(
        { error: "Consumer key and callback URL are required" },
        { status: 400 }
      );
    }

    // For sandbox mode, auto-fill shortcode and passkey
    const isSandbox = environment === "sandbox";
    if (isSandbox) {
      shortcode = "174379";
      passkey = SANDBOX_PASSKEY;
    } else {
      // Production mode requires all fields
      if (!passkey || !shortcode) {
        return NextResponse.json(
          { error: "Shortcode and Passkey are required for production" },
          { status: 400 }
        );
      }
    }

    const supabase = getSupabaseAdmin();

    const existing = await (supabase
      .from("daraja_credentials")
      .select("id, consumer_secret")
      .eq("user_id", user.id)
      .single() as unknown as Promise<{ data: any; error: unknown }>);

    // If updating and no new secret provided, keep the existing one
    const finalSecret = consumer_secret || (existing.data?.consumer_secret ?? "");

    if (!finalSecret) {
      return NextResponse.json(
        { error: "Consumer secret is required" },
        { status: 400 }
      );
    }

    const payload = {
      consumer_key,
      consumer_secret: finalSecret,
      passkey,
      shortcode,
      environment: environment || "sandbox",
      callback_url,
      is_configured: true,
      updated_at: new Date().toISOString(),
    };

    if (existing.data) {
      await supabase
        .from("daraja_credentials")
        .update(payload as never)
        .eq("user_id", user.id);
    } else {
      await supabase
        .from("daraja_credentials")
        .insert({
          user_id: user.id,
          ...payload,
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

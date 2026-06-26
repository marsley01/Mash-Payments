import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getUserFromRequest } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

const SANDBOX_PASSKEY =
  process.env.SANDBOX_PASSKEY ||
  "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919";

const TABLE = "daraja_credentials";

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const { data: creds, error } = await (supabase
    .from(TABLE)
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle() as unknown as Promise<{ data: any; error: unknown }>);

  if (error) {
    const msg = typeof error === "object" && error !== null && "message" in error
      ? String((error as Record<string, unknown>).message)
      : "Database error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

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

    const isSandbox = environment === "sandbox";
    if (isSandbox) {
      shortcode = "174379";
      passkey = SANDBOX_PASSKEY;
    } else {
      if (!passkey || !shortcode) {
        return NextResponse.json(
          { error: "Shortcode and Passkey are required for production" },
          { status: 400 }
        );
      }
    }

    const supabase = getSupabaseAdmin();

    const { data: existing } = await (supabase
      .from(TABLE)
      .select("id, consumer_secret")
      .eq("user_id", user.id)
      .limit(1) as unknown as Promise<{ data: any[] | null; error: unknown }>);

    const row = existing?.[0];
    const existingSecret = row?.consumer_secret ?? "";
    const finalSecret = consumer_secret || existingSecret;

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

    if (row) {
      const { error } = await (supabase
        .from(TABLE)
        .update(payload as never)
        .eq("id", row.id) as unknown as Promise<{ error: unknown }>);
      if (error) throw error;
    } else {
      const { error } = await (supabase
        .from(TABLE)
        .insert({ user_id: user.id, ...payload } as never) as unknown as Promise<{ error: unknown }>);
      if (error) throw error;
    }

    const { error: profErr } = await (supabase
      .from("profiles")
      .update({ setup_step: 3 } as never)
      .eq("id", user.id)
      .lt("setup_step", 3) as unknown as Promise<{ error: unknown }>);
    if (profErr) throw profErr;

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message =
      typeof err === "object" && err !== null && "message" in err
        ? String((err as Record<string, unknown>).message)
        : String(err ?? "Unknown error");
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

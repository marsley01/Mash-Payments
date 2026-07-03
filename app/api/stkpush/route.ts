import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { sendSTKPush } from "@/lib/daraja";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!checkRateLimit("stkpush:" + ip, 10, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const token = request.headers.get("x-token");
    if (!token) {
      return NextResponse.json({ error: "Missing x-token header" }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();

    const { data: profile, error: profileError } = await (supabase
      .from("profiles")
      .select("id, setup_step")
      .eq("api_token", token)
      .single() as unknown as Promise<{ data: any; error: unknown }>);

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Invalid token. Check your Mash Payments dashboard." },
        { status: 401 }
      );
    }

    const { data: creds } = await (supabase
      .from("daraja_credentials")
      .select("*")
      .eq("user_id", profile.id)
      .maybeSingle() as unknown as Promise<{ data: any; error: unknown }>);

    if (!creds || !creds.consumer_key) {
      return NextResponse.json(
        { error: "You haven't saved your Daraja keys yet. Visit your Mash Payments dashboard to set up." },
        { status: 400 }
      );
    }

    const body = await request.json();
    let { phone, amount, reference } = body;

    if (!phone || !amount || !reference) {
      return NextResponse.json(
        { error: "phone, amount, and reference are required" },
        { status: 400 }
      );
    }

    phone = String(phone).replace(/\s+/g, "");
    if (!/^(\+?254|0)?[17]\d{8}$/.test(phone)) {
      return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
    }

    amount = Number(amount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 150000) {
      return NextResponse.json({ error: "Amount must be between 1 and 150,000" }, { status: 400 });
    }

    if (typeof reference !== "string" || reference.length > 100) {
      return NextResponse.json({ error: "Invalid reference" }, { status: 400 });
    }

    const result = await sendSTKPush(
      {
        consumerKey: creds.consumer_key,
        consumerSecret: creds.consumer_secret,
        passkey: creds.passkey,
        shortcode: creds.shortcode,
        callbackUrl: creds.callback_url,
        env: creds.environment,
      },
      phone,
      amount,
      reference
    );

    if (result.ResponseCode === "0") {
      await supabase
        .from("transactions")
        .insert({
          user_id: profile.id,
          phone,
          amount,
          reference,
          checkout_request_id: result.CheckoutRequestID,
          status: "PENDING",
        } as never);

      if (profile.setup_step < 4) {
        await supabase
          .from("profiles")
          .update({ setup_step: 4 } as never)
          .eq("id", profile.id);
      }

      return NextResponse.json({
        success: true,
        checkout_request_id: result.CheckoutRequestID,
        message: "STK Push sent. Ask the customer to check their phone.",
      });
    }

    return NextResponse.json(
      {
        success: false,
        message: result.errorMessage || result.ResponseDescription || "STK push failed",
        ...(result.ResponseCode !== "0" && { detail: result }),
      },
      { status: 500 }
    );
  } catch (err: unknown) {
    const message =
      typeof err === "object" && err !== null && "message" in err
        ? String((err as Record<string, unknown>).message)
        : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

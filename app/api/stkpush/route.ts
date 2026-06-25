import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { sendSTKPush } from "@/lib/daraja";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-api-secret");

  if (!secret || secret !== process.env.API_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { phone, amount, reference } = body;

    if (!phone || !amount || !reference) {
      return NextResponse.json(
        { error: "phone, amount, and reference are required" },
        { status: 400 }
      );
    }

    const supabase = getSupabase();
    const { data: config, error: configError } = await supabase
      .from("daraja_config")
      .select("*")
      .limit(1)
      .single();

    if (configError || !config) {
      return NextResponse.json(
        { error: "Payment gateway not configured yet" },
        { status: 400 }
      );
    }

    const result = await sendSTKPush(
      {
        consumerKey: config.consumer_key,
        consumerSecret: config.consumer_secret,
        passkey: config.passkey,
        shortcode: config.shortcode,
        callbackUrl: config.callback_url,
        env: config.environment,
      },
      phone,
      amount,
      reference
    );

    if (result.ResponseCode === "0") {
      await supabase.from("transactions").insert({
        phone,
        amount,
        reference,
        checkout_request_id: result.CheckoutRequestID,
        status: "PENDING",
      });

      return NextResponse.json({
        success: true,
        checkout_request_id: result.CheckoutRequestID,
        message: "STK Push sent. Check your phone.",
      });
    }

    return NextResponse.json(
      {
        success: false,
        message: result.errorMessage || result.ResponseDescription || "STK push failed",
        error: result,
      },
      { status: 500 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

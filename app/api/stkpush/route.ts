import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { sendSTKPush } from "@/lib/daraja";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
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
    const { phone, amount, reference } = body;

    if (!phone || !amount || !reference) {
      return NextResponse.json(
        { error: "phone, amount, and reference are required" },
        { status: 400 }
      );
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
        error: result,
      },
      { status: 500 }
    );
  } catch {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

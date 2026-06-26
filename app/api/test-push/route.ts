import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { sendSTKPush } from "@/lib/daraja";
import { getUserFromRequest } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdmin();

    const { data: creds } = await (supabase
      .from("daraja_credentials")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle() as unknown as Promise<{ data: any; error: unknown }>);

    if (!creds || !creds.consumer_key) {
      return NextResponse.json(
        { error: "Save your Daraja keys first before testing." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const phone = body.phone;
    const amount = body.amount || 1;
    const reference = "MASH-TEST";

    if (!phone) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
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
          user_id: user.id,
          phone,
          amount,
          reference,
          checkout_request_id: result.CheckoutRequestID,
          status: "PENDING",
        } as never);

      const { data: profile } = await (supabase
        .from("profiles")
        .select("setup_step")
        .eq("id", user.id)
        .single() as unknown as Promise<{ data: any; error: unknown }>);

      if (profile && profile.setup_step < 4) {
        await supabase
          .from("profiles")
          .update({ setup_step: 4 } as never)
          .eq("id", user.id);
      }

      return NextResponse.json({
        success: true,
        checkout_request_id: result.CheckoutRequestID,
        message: "Prompt sent! Check your phone.",
      });
    }

    return NextResponse.json(
      {
        success: false,
        message: result.errorMessage || result.ResponseDescription || "STK push failed",
      },
      { status: 500 }
    );
  } catch {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const callback = body.Body?.stkCallback;

    if (!callback) {
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
    }

    const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = callback;

    if (ResultCode === 0 && CallbackMetadata?.Item) {
      const items = CallbackMetadata.Item;
      const receiptItem = items.find(
        (i: { Name: string }) => i.Name === "MpesaReceiptNumber"
      );
      const mpesaReceipt = receiptItem?.Value || null;

      const supabase = getSupabase();
      await supabase
        .from("transactions")
        .update({
          status: "SUCCESS",
          mpesa_receipt: mpesaReceipt,
        })
        .eq("checkout_request_id", CheckoutRequestID);
    } else {
      const supabase = getSupabase();
      await supabase
        .from("transactions")
        .update({ status: "FAILED" })
        .eq("checkout_request_id", CheckoutRequestID);
    }

    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
  } catch {
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
  }
}

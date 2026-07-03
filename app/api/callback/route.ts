import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const SAFARICOM_IPS = ["196.201.214.200", "196.201.214.206", "196.201.213.200", "196.201.213.206", "196.201.214.208", "196.201.213.208"];

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    if (ip && !SAFARICOM_IPS.includes(ip)) {
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
    }

    const body = await request.json();
    const callback = body.Body?.stkCallback;

    if (!callback) {
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
    }

    const { CheckoutRequestID, ResultCode, CallbackMetadata } = callback;
    const supabase = getSupabaseAdmin();

    if (ResultCode === 0 && CallbackMetadata?.Item) {
      const items = CallbackMetadata.Item;
      const receiptItem = items.find(
        (i: { Name: string }) => i.Name === "MpesaReceiptNumber"
      );
      const mpesaReceipt = receiptItem?.Value || null;

      await supabase
        .from("transactions")
        .update({ status: "SUCCESS", mpesa_receipt: mpesaReceipt } as never)
        .eq("checkout_request_id", CheckoutRequestID);
    } else {
      await supabase
        .from("transactions")
        .update({ status: "FAILED" } as never)
        .eq("checkout_request_id", CheckoutRequestID);
    }

    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
  } catch {
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
  }
}

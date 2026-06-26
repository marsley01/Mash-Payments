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
  const { data, error } = await (supabase
    .from("transactions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false }) as unknown as Promise<{ data: any; error: unknown }>);

  if (error) {
    const msg = typeof error === "object" && error !== null && "message" in error
      ? String((error as Record<string, unknown>).message)
      : "Database error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ transactions: data });
}

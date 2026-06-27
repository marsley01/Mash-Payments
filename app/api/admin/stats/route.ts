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

  const { data: profile } = await (supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single() as unknown as Promise<{ data: { role: string } | null; error: unknown }>);

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { count: totalUsers } = await (supabase
    .from("profiles")
    .select("*", { count: "exact", head: true }) as unknown as Promise<{ count: number | null; error: unknown }>);

  const { count: totalTransactions } = await (supabase
    .from("transactions")
    .select("*", { count: "exact", head: true }) as unknown as Promise<{ count: number | null; error: unknown }>);

  const { data: revenueData } = await (supabase
    .from("transactions")
    .select("amount")
    .eq("status", "SUCCESS") as unknown as Promise<{ data: { amount: number }[] | null; error: unknown }>);

  const totalRevenue = (revenueData || []).reduce((sum, t) => sum + Number(t.amount), 0);

  const { count: activeGateways } = await (supabase
    .from("daraja_credentials")
    .select("*", { count: "exact", head: true })
    .eq("is_configured", true) as unknown as Promise<{ count: number | null; error: unknown }>);

  return NextResponse.json({
    totalUsers: totalUsers || 0,
    totalTransactions: totalTransactions || 0,
    totalRevenue,
    activeGateways: activeGateways || 0,
  });
}

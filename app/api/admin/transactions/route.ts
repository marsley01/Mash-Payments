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

  const { data, error } = await (supabase
    .from("transactions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200) as unknown as Promise<{ data: any[] | null; error: unknown }>);

  if (error) {
    const msg = typeof error === "object" && error !== null && "message" in error
      ? String((error as Record<string, unknown>).message)
      : "Database error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ transactions: data || [] });
}

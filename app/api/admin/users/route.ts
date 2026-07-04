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

  const { data: profiles, error: profilesError } = await (supabase
    .from("profiles")
    .select("*, daraja_credentials(is_configured)")
    .order("created_at", { ascending: false }) as unknown as Promise<{ data: any[] | null; error: unknown }>);

  if (profilesError) {
    const msg = typeof profilesError === "object" && profilesError !== null && "message" in profilesError
      ? String((profilesError as Record<string, unknown>).message)
      : "Database error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const { data: authData } = await (supabase.auth as any).admin.listUsers();
  const userMap = new Map((authData?.users || []).map((u: any) => [u.id, u.email]));

  const users = (profiles || []).map((p: any) => ({
    id: p.id,
    email: userMap.get(p.id) || null,
    business_name: p.business_name,
    api_token: p.api_token
      ? p.api_token.slice(0, 10) + "..." + p.api_token.slice(-4)
      : null,
    setup_step: p.setup_step,
    role: p.role || "user",
    is_configured: p.daraja_credentials?.[0]?.is_configured || false,
    created_at: p.created_at,
  }));

  return NextResponse.json({ users });
}

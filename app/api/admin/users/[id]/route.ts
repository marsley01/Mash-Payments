import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getUserFromRequest } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

  try {
    const body = await request.json();
    const { role } = body;

    if (!role || !["user", "admin"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const { error } = await (supabase
      .from("profiles")
      .update({ role } as never)
      .eq("id", params.id) as unknown as Promise<{ error: unknown }>);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = typeof err === "object" && err !== null && "message" in err
      ? String((err as Record<string, unknown>).message)
      : "Update failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

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
    const { role, setup_step, is_configured } = body;

    const updates: Record<string, unknown> = {};

    if (role) {
      if (!["user", "admin"].includes(role)) {
        return NextResponse.json({ error: "Invalid role" }, { status: 400 });
      }
      updates.role = role;
    }

    if (setup_step !== undefined) {
      if (typeof setup_step !== "number" || setup_step < 1 || setup_step > 4) {
        return NextResponse.json({ error: "Invalid setup_step" }, { status: 400 });
      }
      updates.setup_step = setup_step;
    }

    if (is_configured !== undefined) {
      updates.is_configured = is_configured;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const { error } = await (supabase
      .from("profiles")
      .update(updates as never)
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

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed: unknown = await request.json().catch(() => null);
  if (parsed === null || typeof parsed !== "object") {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const body = parsed as { display_name?: unknown };
  const raw = typeof body.display_name === "string" ? body.display_name.trim() : "";

  if (raw.length === 0 || raw.length > 50) {
    return NextResponse.json({ error: "invalid_display_name" }, { status: 400 });
  }

  const { error } = await supabase
    .from("user_profiles")
    .upsert({ id: user.id, display_name: raw }, { onConflict: "id" });

  if (error) {
    console.error("display-name PATCH:", error.message);
    return NextResponse.json(
      { error: "save_failed", message: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ display_name: raw });
}

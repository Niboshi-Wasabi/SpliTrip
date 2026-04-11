import { NextRequest, NextResponse } from "next/server";
import { validateDisplayNameInput } from "@/lib/validation/display-name";
import { createClient } from "@/utils/supabase/server";

const INTERNAL_SERVER_ERROR_MESSAGE =
  "サーバーで予期せぬエラーが発生しました。";

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
  const validation = validateDisplayNameInput(body.display_name);

  if (!validation.ok) {
    if (validation.reason === "too_long") {
      return NextResponse.json(
        { error: "display_name_too_long" },
        { status: 400 },
      );
    }
    if (validation.reason === "empty") {
      return NextResponse.json(
        { error: "display_name_required" },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "invalid_display_name" }, { status: 400 });
  }

  const displayNameValue = validation.value;

  const { error } = await supabase.rpc("update_display_name", {
    p_display_name: displayNameValue,
  });

  if (error) {
    console.error("[API/Action Error - PATCH /api/profile/display-name]:", error);
    return NextResponse.json(
      { error: "save_failed", message: INTERNAL_SERVER_ERROR_MESSAGE },
      { status: 500 },
    );
  }

  return NextResponse.json({ display_name: displayNameValue });
}

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isAdminStepUpVerified } from "@/lib/auth/two-factor";

/**
 * 管理 API は `/admin` と同じ Step-Up Cookie 必須（webauthn-verify 成功後 15 分）。
 */
export function requireAdminStepUpOrJson(
  request: NextRequest,
  userId: string,
): NextResponse | null {
  if (isAdminStepUpVerified(request, userId)) {
    return null;
  }
  return NextResponse.json(
    { ok: false, message: "step_up_required" },
    { status: 403 },
  );
}

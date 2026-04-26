import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isAdminStepUpVerified } from "@/lib/auth/two-factor";

/**
 * 管理 API 用: WebAuthn による Step-Up（再認証）を要求できたが、
 * 2FA/Step-Up 廃止に伴い、現状は通過させる。セッション＋`is_admin` チェックは各ルートで実施。
 */
export function requireAdminStepUpOrJson(
  request: NextRequest,
  userId: string,
): NextResponse | null {
  if (process.env.ADMIN_STEP_UP_ENABLED === "true") {
    if (isAdminStepUpVerified(request, userId)) {
      return null;
    }
    return NextResponse.json(
      { ok: false, message: "step_up_required" },
      { status: 403 },
    );
  }
  return null;
}

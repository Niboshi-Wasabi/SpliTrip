import { NextRequest, NextResponse } from "next/server";
import { verifyTurnstileToken } from "@/lib/turnstile/verify";
import { isTurnstileConfigured } from "@/utils/turnstile/env";

type VerifyRequestBody = {
  token?: string;
};

function getRemoteIp(request: NextRequest): string | undefined {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (!forwardedFor) {
    return undefined;
  }

  const [first] = forwardedFor.split(",");
  const trimmed = first?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

export async function POST(request: NextRequest) {
  if (!isTurnstileConfigured()) {
    return NextResponse.json({ success: true });
  }

  let body: VerifyRequestBody;
  try {
    body = (await request.json()) as VerifyRequestBody;
  } catch {
    return NextResponse.json({ success: false }, { status: 400 });
  }

  const token = (body.token ?? "").trim();
  if (!token) {
    return NextResponse.json({ success: false }, { status: 400 });
  }

  const isValid = await verifyTurnstileToken(token, getRemoteIp(request));
  if (!isValid) {
    return NextResponse.json({ success: false }, { status: 403 });
  }

  return NextResponse.json({ success: true });
}

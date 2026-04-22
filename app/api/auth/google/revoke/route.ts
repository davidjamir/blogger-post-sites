import { NextResponse } from "next/server";
import { connectDb } from "@/lib/db";
import { revokeGoogleToken } from "@/lib/google-oauth-web";
import { verifyCronSecret } from "@/lib/cron-auth";
import { AccountApi } from "@/lib/models";

/**
 * Tương đương mẫu `GET /revoke` (POST tới `oauth2.googleapis.com/revoke?token=...`).
 * Bảo vệ: dùng cùng cơ chế với cron — `Authorization: Bearer CRON_SECRET`.
 */
export async function POST(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await connectDb();
  const cred = await AccountApi.findOne().sort({ updatedAt: -1 }).lean();
  const token = cred?.accessToken || cred?.refreshToken;
  if (!token) {
    return NextResponse.json({ error: "no_credentials" }, { status: 400 });
  }

  const res = await revokeGoogleToken(token);
  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json(
      { error: "revoke_failed", status: res.status, body: text },
      { status: 502 }
    );
  }

  await AccountApi.deleteMany({ email: cred.email });
  return NextResponse.json({ ok: true, revoked: true });
}

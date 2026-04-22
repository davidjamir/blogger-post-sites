import { NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron-auth";
import { refreshAccessTokenForCron } from "@/lib/google-auth";

export const dynamic = "force-dynamic";

const LOG = "[cron/refresh-google-token]";

/**
 * Vercel Cron (vercel.json) — refresh access token Google nếu cần; log trên Functions.
 */
export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    console.log(`${LOG} 401 — CRON_SECRET không khớp hoặc thiếu`);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log(`${LOG} Bắt đầu (refresh access token nếu cần)`);
  const result = await refreshAccessTokenForCron();
  console.log(`${LOG} Kết thúc`, result);

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error, job: "refresh-google-token" },
      { status: 200 }
    );
  }
  return NextResponse.json({
    ok: true,
    job: "refresh-google-token",
    email: result.email,
    refreshed: result.refreshed,
    accessExpiresAt: result.accessExpiresAtIso,
  });
}

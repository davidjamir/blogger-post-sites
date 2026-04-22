import { NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron-auth";
import {
  defaultCronMaxAccounts,
  refreshAccountsExpiringWithinWindow,
} from "@/lib/refresh-accounts-cron";

export const dynamic = "force-dynamic";

/**
 * Refresh mọi `account_api` có `expired` trong cửa sổ (mặc định 10 phút).
 * Query: `withinMinutes` (0–1440), `max` (tối đa 5000).
 * Header: `Authorization: Bearer <CRON_SECRET>` hoặc `x-cron-secret`.
 *
 * **Gọi từ ngoài:** chỉ là HTTP (GET/POST) tới URL đầy đủ của app, ví dụ
 * `curl -H "Authorization: Bearer $CRON_SECRET" "https://.../api/cron/refresh-tokens?withinMinutes=10"`.
 * Không có socket riêng — Worker / cron / Uptime đều chỉ `fetch` hoặc `curl` như vậy.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const withinParam = url.searchParams.get("withinMinutes");
  const maxParam = url.searchParams.get("max");
  let withinMinutes = 10;
  if (withinParam && /^\d+$/.test(withinParam)) {
    const n = parseInt(withinParam, 10);
    if (n >= 0 && n <= 24 * 60) {
      withinMinutes = n;
    }
  }
  const maxFromEnv = defaultCronMaxAccounts();
  let maxAccounts = maxFromEnv;
  if (maxParam && /^\d+$/.test(maxParam)) {
    const n = parseInt(maxParam, 10);
    if (n > 0) {
      maxAccounts = Math.min(n, 5000);
    }
  }
  const out = await refreshAccountsExpiringWithinWindow({
    withinMinutes,
    maxAccounts,
  });
  const ok = out.results.filter((r) => "ok" in r && r.ok === true).length;
  const failed = out.results.length - ok;
  const result = {
    job: "refresh-tokens" as const,
    withinMinutes: out.withinMinutes,
    maxAccounts: out.maxAccounts,
    totalMatched: out.totalMatched,
    summary: { ok, failed, processed: out.results.length },
    results: out.results,
  };
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  return GET(request);
}

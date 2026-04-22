import { NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron-auth";
import {
  defaultPublishQueueLimit,
  processPublishPostQueue,
} from "@/lib/publish-queue";

export const dynamic = "force-dynamic";

/**
 * Lấy bài từ `post_queue` (pending → processing → done/failed).
 * Query `limit` (1–100) tùy chọn; mặc định `CRON_MAX_PUBLISH_PER_RUN` hoặc 10.
 */
export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(request.url);
  const limitParam = url.searchParams.get("limit");
  let limit = defaultPublishQueueLimit();
  if (limitParam && /^\d+$/.test(limitParam)) {
    const n = parseInt(limitParam, 10);
    if (n > 0) {
      limit = Math.min(n, 100);
    }
  }
  const out = await processPublishPostQueue({ limit });
  return NextResponse.json({ job: "publish-posts" as const, ...out });
}

export async function POST(request: Request) {
  return GET(request);
}

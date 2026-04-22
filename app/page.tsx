import Link from "next/link";
import { connectDb } from "@/lib/db";
import { formatDateTimeDisplayUtc7 } from "@/lib/datetime";
import { AccountApi } from "@/lib/models";

type HomeStatus =
  | { connected: false; dbError?: true }
  | {
      connected: true;
      email: string;
      expired: Date;
      scope: string;
      updatedAt?: Date;
    };

async function getStatus(): Promise<HomeStatus> {
  try {
    await connectDb();
    const doc = await AccountApi.findOne()
      .sort({ updatedAt: -1 })
      .select("email expired scope updatedAt")
      .lean()
      .exec();
    if (!doc || typeof doc !== "object" || !("email" in doc)) {
      return { connected: false };
    }
    const updatedAt =
      "updatedAt" in doc && doc.updatedAt instanceof Date
        ? doc.updatedAt
        : undefined;
    const expired =
      doc.expired instanceof Date ? doc.expired : new Date(String(doc.expired));
    return {
      connected: true,
      email: String(doc.email),
      expired,
      scope: "scope" in doc && doc.scope ? String(doc.scope) : "",
      updatedAt,
    };
  } catch {
    return { connected: false, dbError: true };
  }
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string }>;
}) {
  const params = await searchParams;
  const status = await getStatus();
  const justConnected = params.connected === "1";

  return (
    <main className="page">
      <h1>Blogger Post Sites</h1>
      <p className="lead">
        Đăng nhập Google (OAuth2) — lưu refresh / access token vào collection{" "}
        <code>account_api</code> (database <code>databases</code>).
      </p>

      {justConnected && (
        <p className="success-banner">
          Đã kết nối Google. Token đã được lưu vào MongoDB.
        </p>
      )}

      <div className="card">
        <strong>Trạng thái OAuth</strong>
        {status.connected ? (
          <div className="status-block">
            <p className="status-line">
              Tài khoản: <code>{status.email}</code>
            </p>
            <p className="status-meta">
              Access token hết hạn (UTC+7 / giờ VN):{" "}
              <code>
                {formatDateTimeDisplayUtc7(
                  status.expired instanceof Date
                    ? status.expired
                    : new Date(String(status.expired))
                )}
              </code>
            </p>
            {status.updatedAt != null ? (
              <p className="status-meta">
                Cập nhật lần cuối (UTC+7):{" "}
                <code>
                  {formatDateTimeDisplayUtc7(status.updatedAt)}
                </code>
              </p>
            ) : null}
            {status.scope ? (
              <p className="status-meta" title="Chuỗi scope từ Google">
                Scope: <code className="scope-block">{status.scope}</code>
              </p>
            ) : null}
          </div>
        ) : (
          <p className="status-placeholder">
            {status.dbError
              ? "Không kết nối được MongoDB (kiểm tra MONGODB_URI, MONGODB_DB_NAME)."
              : "Chưa đăng nhập Google."}
          </p>
        )}
        <div className="card-actions">
          <Link href="/login" className="btn btn-primary">
            Mở trang đăng nhập
          </Link>
        </div>
      </div>

      <div className="card">
        <strong>API</strong>
        <p className="status-meta" style={{ marginTop: "0.5rem" }}>
          <code>/api/auth/*</code> và <code>/api/cron/*</code>.
        </p>
        <ul className="api-list">
          <li>
            <code>GET /api/auth/google</code> — OAuth (redirect Google)
          </li>
          <li>
            <code>GET /api/auth/google/callback</code> — callback token
          </li>
          <li>
            <code>GET /api/cron/refresh-tokens</code> — Bearer <code>CRON_SECRET</code>; query{" "}
            <code>withinMinutes</code>, <code>max</code>
          </li>
          <li>
            <code>GET /api/cron/publish-posts</code> — Bearer <code>CRON_SECRET</code>; query{" "}
            <code>limit</code> (hàng đợi <code>post_queue</code> khi bạn cấu hình)
          </li>
        </ul>
      </div>
    </main>
  );
}

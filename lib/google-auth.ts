import { google } from "googleapis";
import { getAppBaseUrl } from "./env";
import { connectDb } from "./db";
import { AccountApi } from "./models";

const GOOGLE_OAUTH_CALLBACK_PATH = "/api/auth/google/callback";

/**
 * Một request OAuth phải dùng cùng `redirect_uri` ở bước `generateAuthUrl` và bước `getToken`.
 * `publicOrigin` lấy động từ mỗi request (ví dụ getOAuthPublicOrigin), không hardcode .env.
 */
export function buildGoogleOAuthRedirectUri(publicOrigin: string): string {
  const base = publicOrigin.replace(/\/$/, "");
  return `${base}${GOOGLE_OAUTH_CALLBACK_PATH}`;
}

export function createOAuth2Client(redirectUri: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET");
  }
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export async function getBloggerClient() {
  await connectDb();
  const cred = await AccountApi.findOne().sort({ updatedAt: -1 }).lean();
  if (!cred) {
    throw new Error("Chưa đăng nhập Google. Vào /login để kết nối.");
  }

  const oauth2 = createOAuth2Client(
    buildGoogleOAuthRedirectUri(getAppBaseUrl())
  );
  const now = Date.now();
  const expiresAt = new Date(cred.expired).getTime();
  const hasRefresh = Boolean(cred.refreshToken?.trim());

  oauth2.setCredentials({
    ...(hasRefresh
      ? {
          refresh_token: cred.refreshToken,
          access_token: cred.accessToken,
          expiry_date: expiresAt,
        }
      : {
          access_token: cred.accessToken,
          expiry_date: expiresAt,
        }),
  });

  if (hasRefresh && (!cred.accessToken || now >= expiresAt - 60_000)) {
    const { credentials } = await oauth2.refreshAccessToken();
    const newAccess = credentials.access_token;
    const newExpiry = credentials.expiry_date
      ? new Date(credentials.expiry_date)
      : new Date(now + 3600_000);
    if (!newAccess) {
      throw new Error("Không lấy được access token sau refresh");
    }
    const update: {
      accessToken: string;
      expired: Date;
      scope?: string;
    } = { accessToken: newAccess, expired: newExpiry };
    if (typeof credentials.scope === "string" && credentials.scope.trim()) {
      update.scope = credentials.scope.trim();
    }
    await AccountApi.updateOne({ email: cred.email }, update);
    oauth2.setCredentials({ ...credentials, refresh_token: cred.refreshToken });
  } else if (!hasRefresh && now >= expiresAt - 60_000) {
    throw new Error(
      "Access token hết hạn và không có refresh token trong DB. Đăng nhập lại từ /login."
    );
  }

  const blogger = google.blogger({ version: "v3", auth: oauth2 });
  return blogger;
}

export type CronRefreshResult =
  | { ok: true; email: string; refreshed: boolean; accessExpiresAtIso: string }
  | { ok: false; error: string };

/**
 * Gọi từ `GET /api/cron/refresh-google-token` (Vercel Cron, xem `vercel.json`):
 * đảm bảo access token còn dùng được (refresh nếu cần).
 * Mọi bước ghi `console.log` với prefix `[cron/refresh]` — kết hợp log route `[cron/refresh-google-token]`.
 */
export async function refreshAccessTokenForCron(): Promise<CronRefreshResult> {
  const log = (msg: string, extra?: Record<string, unknown>) => {
    console.log(
      `[cron/refresh] ${new Date().toISOString()} ${msg}`,
      extra && Object.keys(extra).length > 0 ? extra : ""
    );
  };
  try {
    await connectDb();
    const cred = await AccountApi.findOne().sort({ updatedAt: -1 }).lean();
    if (!cred) {
      log("Chưa có document trong account_api", {});
      return { ok: false, error: "Chưa có tài khoản OAuth trong DB" };
    }
    log("Đã load tài khoản", { email: cred.email });
    const oauth2 = createOAuth2Client(
      buildGoogleOAuthRedirectUri(getAppBaseUrl())
    );
    const now = Date.now();
    const expiresAt = new Date(cred.expired).getTime();
    const hasRefresh = Boolean(cred.refreshToken?.trim());
    const msToExpiry = expiresAt - now;
    log("Trạng thái token trước khi xử lý", {
      hasRefreshToken: hasRefresh,
      accessExpiresInSec: Math.round(msToExpiry / 1000),
      willCallRefresh: Boolean(
        hasRefresh && (!cred.accessToken || now >= expiresAt - 60_000)
      ),
    });
    oauth2.setCredentials({
      ...(hasRefresh
        ? {
            refresh_token: cred.refreshToken,
            access_token: cred.accessToken,
            expiry_date: expiresAt,
          }
        : {
            access_token: cred.accessToken,
            expiry_date: expiresAt,
          }),
    });
    if (hasRefresh && (!cred.accessToken || now >= expiresAt - 60_000)) {
      log("Gọi oauth2.refreshAccessToken() …", {});
      const { credentials } = await oauth2.refreshAccessToken();
      const newAccess = credentials.access_token;
      const newExpiry = credentials.expiry_date
        ? new Date(credentials.expiry_date)
        : new Date(now + 3600_000);
      if (!newAccess) {
        log("Lỗi: Google không trả access_token", {});
        return { ok: false, error: "Google không trả access_token sau refresh" };
      }
      const update: {
        accessToken: string;
        expired: Date;
        scope?: string;
      } = { accessToken: newAccess, expired: newExpiry };
      if (typeof credentials.scope === "string" && credentials.scope.trim()) {
        update.scope = credentials.scope.trim();
      }
      await AccountApi.updateOne({ email: cred.email }, update);
      const iso = newExpiry.toISOString();
      log("Refresh thành công, đã cập nhật DB", { newExpiry: iso });
      return {
        ok: true,
        email: cred.email,
        refreshed: true,
        accessExpiresAtIso: iso,
      };
    }
    if (!hasRefresh && now >= expiresAt - 60_000) {
      log("Lỗi: không còn refresh token và access đã hết hạn", {});
      return {
        ok: false,
        error: "Cần đăng nhập lại: không còn refresh token",
      };
    }
    const iso = new Date(cred.expired).toISOString();
    log("Bỏ qua refresh — access còn hạn (dự phòng 60s trước khi hết hạn)", {
      accessExpiresAt: iso,
    });
    return {
      ok: true,
      email: cred.email,
      refreshed: false,
      accessExpiresAtIso: iso,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    log("Exception", { error: message });
    return { ok: false, error: message };
  }
}

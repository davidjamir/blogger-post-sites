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

export async function getBloggerClient(googleAccountEmail?: string) {
  await connectDb();
  const cred = googleAccountEmail
    ? await AccountApi.findOne({ email: googleAccountEmail.trim() }).lean()
    : await AccountApi.findOne().sort({ updatedAt: -1 }).lean();
  if (!cred) {
    throw new Error(
      googleAccountEmail
        ? `Không tìm thấy OAuth cho email: ${googleAccountEmail}`
        : "Chưa đăng nhập Google. Vào /login để kết nối."
    );
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
    const at = new Date();
    const update: {
      accessToken: string;
      expired: Date;
      updatedAt: Date;
      scope?: string;
    } = {
      accessToken: newAccess,
      expired: newExpiry,
      updatedAt: at,
    };
    if (typeof credentials.scope === "string" && credentials.scope.trim()) {
      update.scope = credentials.scope.trim();
    }
    await AccountApi.updateOne({ email: cred.email }, { $set: update });
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

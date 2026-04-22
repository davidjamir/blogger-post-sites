import { google } from "googleapis";
import { BLOGGER_OAUTH_SCOPES } from "./blogger-scopes";

type OAuth2Client = InstanceType<typeof google.auth.OAuth2>;

/**
 * URL ủy quyên — cùng tham số mẫu tài liệu Node (google.auth.OAuth2 + generateAuthUrl):
 * `access_type: 'offline'`, `scope`, `include_granted_scopes: true`, `state`.
 * Session trong mẫu dùng `req.session.state`; app Next dùng cookie `oauth_state` (tương đương).
 *
 * Lưu refresh token an toàn (DB) xem: https://github.com/googleapis/google-api-nodejs-client#handling-refresh-tokens
 */
/**
 * @param redirectUri - Trùng `buildGoogleOAuthRedirectUri(origin)` — gửi tường minh
 *   để request tới Google luôn có `redirect_uri` đúng từng môi trường (dev/preview/prod).
 */
export function generateWebServerAuthUrl(
  oauth2: OAuth2Client,
  state: string,
  redirectUri: string
): string {
  return oauth2.generateAuthUrl({
    access_type: "offline",
    /** Một chuỗi scope URL hoặc mảng — mẫu dùng mảng. */
    scope: [...BLOGGER_OAUTH_SCOPES],
    include_granted_scopes: true,
    state,
    /** Khớp third param của `new OAuth2(..., redirectUri)` / `getToken` — bắt buộc đồng bộ. */
    redirect_uri: redirectUri,
  });
}

/**
 * Xác minh vài scope Blogger đã nằm trong chuỗi Google trả về (dấu cách phân tách).
 * Mẫu tài liệu: `if (tokens.scope.includes('...'))` cho từng API.
 */
export function scopeIncludesBlogger(
  raw: string | null | undefined
): boolean {
  if (!raw) {
    return false;
  }
  return BLOGGER_OAUTH_SCOPES.some((s) => raw.split(/\s+/).includes(s));
}

/**
 * Revoke theo tài liệu: POST `https://oauth2.googleapis.com/revoke` với `token=`.
 * @see mẫu /revoke (https.request) trong tài liệu Node
 */
export async function revokeGoogleToken(token: string): Promise<Response> {
  return fetch("https://oauth2.googleapis.com/revoke", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ token }),
  });
}

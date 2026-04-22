/**
 * Scope chuỗi gửi lên Google OAuth (URL).
 * - `blogger` — gọi Blogger API.
 * - `userinfo.email` — bắt buộc cho `google.oauth2({ v2 }).userinfo.get()` (lấy email lưu DB);
 *   chỉ có scope blogger thì token **không** dùng được với UserInfo → lỗi 401 thiếu credential.
 */
export const BLOGGER_OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/blogger",
  "https://www.googleapis.com/auth/userinfo.email",
] as const;

export function getBloggerOAuthScopeString(): string {
  return BLOGGER_OAUTH_SCOPES.join(" ");
}

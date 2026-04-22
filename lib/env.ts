/**
 * URL “công khai” của app (cron, link tuyệt đối khi không có request).
 * OAuth **không** dùng hàm này — dùng getOAuthPublicOrigin(request) để khớp tab trình duyệt.
 */
export function getAppBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  // `vercel dev` gán VERCEL_URL (preview) nhưng OAuth đã lấy qua localhost — refresh
  // token phải cùng redirect_uri; chỉ dùng VERCEL_URL khi chạy build production trên Vercel.
  if (process.env.VERCEL_URL && process.env.NODE_ENV === "production") {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

/**
 * Origin “trình duyệt thấy” — bắt buộc trùng redirect_uri khai trên Google Cloud.
 * `vercel dev` proxy (localhost:3000 → Next ở cổng nội bộ); `new URL(request.url).origin`
 * có thể là `http://localhost:5450x` → redirect_uri_mismatch. Ưu tiên header
 * chuẩn proxy: x-forwarded-host, x-forwarded-proto.
 */
export function getOAuthPublicOrigin(request: Request): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (forwardedHost) {
    const host = forwardedHost.split(",")[0].trim();
    const protoFromHeader = forwardedProto?.split(",")[0]?.trim();
    const proto =
      protoFromHeader ||
      (host.includes("localhost") || host.startsWith("127.")
        ? "http"
        : "https");
    return `${proto}://${host}`.replace(/\/$/, "");
  }
  return new URL(request.url).origin.replace(/\/$/, "");
}

/** Cookie lưu `origin` lúc bắt đầu OAuth (cùng `redirect_uri` với bước sau). */
export const OAUTH_PUBLIC_ORIGIN_COOKIE = "oauth_public_origin" as const;

/**
 * Chỉ chấp nhận dạng origin (có thể dùng làm cơ sở redirect_uri) — tránh dữ liệu bất thường trong cookie.
 */
export function isPlausibleRequestOrigin(s: string): boolean {
  try {
    if (s.length > 512) {
      return false;
    }
    const u = new URL(s);
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      return false;
    }
    if (u.username || u.password) {
      return false;
    }
    if (u.search || u.hash) {
      return false;
    }
    if (u.pathname !== "/" && u.pathname !== "") {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

type CookieGet = { get(name: string): { value: string } | undefined };

/**
 * Callback: ưu tiên `origin` đã lưu khi gọi `GET /api/auth/google` (trùng `redirect_uri` gửi Google),
 * fallback `getOAuthPublicOrigin` nếu thiếu / không hợp lệ.
 */
export function getResolvedOAuthPublicOrigin(
  request: Request & { cookies: CookieGet }
): string {
  const fromCookie = request.cookies.get(OAUTH_PUBLIC_ORIGIN_COOKIE)?.value;
  if (fromCookie && isPlausibleRequestOrigin(fromCookie)) {
    return fromCookie.replace(/\/$/, "");
  }
  return getOAuthPublicOrigin(request);
}

/** Server Component (chỉ có `headers()`, không có `Request.url` đủ) — cùng quy tắc `x-forwarded-*`. */
export function getOAuthPublicOriginFromHeaders(headerList: {
  get(name: string): string | null;
}): string {
  const forwardedHost = headerList.get("x-forwarded-host");
  const forwardedProto = headerList.get("x-forwarded-proto");
  if (forwardedHost) {
    const host = forwardedHost.split(",")[0].trim();
    const protoFromHeader = forwardedProto?.split(",")[0]?.trim();
    const proto =
      protoFromHeader ||
      (host.includes("localhost") || host.startsWith("127.")
        ? "http"
        : "https");
    return `${proto}://${host}`.replace(/\/$/, "");
  }
  const host = headerList.get("host")?.split(",")[0].trim();
  if (host) {
    const proto = host.includes("localhost") || host.startsWith("127.")
      ? "http"
      : "https";
    return `${proto}://${host}`.replace(/\/$/, "");
  }
  return "http://localhost:3000";
}

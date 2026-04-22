"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

const errors: Record<string, string> = {
  oauth_config:
    "Thiếu GOOGLE_CLIENT_ID hoặc GOOGLE_CLIENT_SECRET (.env.local / Vercel).",
  invalid_oauth: "Phiên đăng nhập không hợp lệ (state/code). Thử lại.",
  no_refresh_token:
    "Google không trả refresh token. Gỡ quyền app trên tài khoản Google rồi đăng nhập lại (tài liệu: chỉ lần uỷ quyền đầu).",
  token_exchange:
    "Đổi code lấy token thất bại. Kiểm tra Client ID/Secret và redirect URI trong Google Cloud.",
};

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

type LoginClientProps = {
  errorKey?: string;
  publicOrigin: string;
};

/**
 * Luồng ứng dụng web phía máy chủ: `GET /api/auth/google` → Google → `GET /api/auth/google/callback?code=…`
 * @see https://developers.google.com/identity/protocols/oauth2/web-server?hl=vi#node.js_2
 */
export function LoginClient({ errorKey, publicOrigin }: LoginClientProps) {
  const [copied, setCopied] = useState(false);
  const errMsg = errorKey
    ? (errors[errorKey] ?? `Lỗi: ${errorKey}`)
    : null;

  const callbackUrl = publicOrigin
    ? `${publicOrigin}/api/auth/google/callback`
    : null;

  const onCopy = useCallback(async () => {
    if (!callbackUrl) return;
    try {
      await navigator.clipboard.writeText(callbackUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [callbackUrl]);

  return (
    <main className="login-page">
      <div className="login-page__glow" aria-hidden />
      <div className="login-page__grid" aria-hidden />
      <div className="login-wrap">
        <div className="login-badge">OAuth 2.0 · Web server</div>
        <h1 className="login-title">Đăng nhập Google</h1>
        <p className="login-sub">
          Máy chủ dùng <code>google.auth.OAuth2</code> + <code>generateAuthUrl</code> (
          <code>access_type=offline</code>, <code>include_granted_scopes</code>,{" "}
          <code>state</code>, <code>prompt=consent</code>) rồi <code>getToken</code> đổi{" "}
          <code>code</code> lấy <strong>refresh token</strong> + access token, lưu MongoDB
          (<code>account_api</code>).
        </p>
        {errMsg ? (
          <div className="login-alert" role="alert">
            <span className="login-alert__icon" aria-hidden>
              !
            </span>
            <span>{errMsg}</span>
          </div>
        ) : null}
        <div className="login-panel login-panel--cta">
          <a className="btn-google" href="/api/auth/google">
            <GoogleIcon />
            Tiếp tục với Google
          </a>
          <p className="login-route-hint mono">
            <code>GET /api/auth/google</code> → Google → <code>…/api/auth/google/callback?code=</code>
          </p>
          <p className="map-note" style={{ marginTop: "0.75rem" }}>
            <strong>Google Cloud</strong> — Loại: Ứng dụng web. <em>URI chuyển hướng được
            uỷ quyền</em> (khớp tuyệt đối, từng môi trường):
          </p>
          <div className="callback-box" style={{ marginTop: "0.5rem" }}>
            <code>{callbackUrl ?? "{origin}/api/auth/google/callback"}</code>
            <button
              type="button"
              className="btn-copy"
              onClick={onCopy}
              disabled={!callbackUrl}
            >
              {copied ? "Đã chép" : "Sao chép"}
            </button>
          </div>
          <p className="map-note" style={{ marginTop: "0.75rem" }}>
            Tài liệu:{" "}
            <a
              href="https://developers.google.com/identity/protocols/oauth2/web-server?hl=vi#node.js_2"
              target="_blank"
              rel="noreferrer"
            >
              OAuth 2.0 cho ứng dụng máy chủ web (Node.js)
            </a>
          </p>
          <div className="login-actions">
            <Link href="/" className="link-quiet">
              ← Về trang chủ
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

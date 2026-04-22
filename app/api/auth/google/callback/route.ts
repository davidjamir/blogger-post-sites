import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { getResolvedOAuthPublicOrigin, OAUTH_PUBLIC_ORIGIN_COOKIE } from "@/lib/env";
import { connectDb } from "@/lib/db";
import { buildGoogleOAuthRedirectUri, createOAuth2Client } from "@/lib/google-auth";
import { scopeIncludesBlogger } from "@/lib/google-oauth-web";
import { AccountApi, normalizeAccountEmail } from "@/lib/models";
import {
  logOAuthCallbackError,
  logOAuthCallbackIncoming,
  logOAuthCallbackSuccess,
  logOAuthCallbackValidation,
  logOAuthGetTokenResult,
  logOAuthUserInfoResult,
} from "@/lib/oauth-debug-log";

function clearOauthStartCookies(res: NextResponse) {
  res.cookies.set("oauth_state", "", { path: "/", maxAge: 0 });
  res.cookies.set(OAUTH_PUBLIC_ORIGIN_COOKIE, "", { path: "/", maxAge: 0 });
}

/**
 * Tương đương `app.get('/oauth2callback', ...)` trong mẫu:
 * `if (q.error)` → `else if (q.state !== session.state)` → `else getToken(q.code)`.
 * Dùng cùng `redirect_uri` với bước cấp mã: cookie `oauth_public_origin` + `buildGoogleOAuthRedirectUri`
 * (nếu có), fallback header request.
 */
export async function GET(request: NextRequest) {
  const origin = getResolvedOAuthPublicOrigin(request);
  logOAuthCallbackIncoming(request, origin);

  const q = request.nextUrl.searchParams;
  const oauthError = q.get("error");
  const oauthErrorDescription = q.get("error_description");

  if (oauthError) {
    console.log("[oauth/callback] Google trả lỗi (q.error):", oauthError, oauthErrorDescription);
    const res = NextResponse.redirect(
      `${origin}/login?error=${oauthError === "access_denied" ? "access_denied" : "oauth"}`
    );
    clearOauthStartCookies(res);
    return res;
  }

  const code = q.get("code");
  const state = q.get("state");
  const cookieState = request.cookies.get("oauth_state")?.value;
  const stateMatch = Boolean(state && cookieState && state === cookieState);

  logOAuthCallbackValidation({
    hasCode: Boolean(code),
    stateFromQuery: state,
    cookieState,
    stateMatch,
  });

  if (state !== cookieState) {
    console.log("[oauth/callback] State mismatch. Possible CSRF attack");
    const res = NextResponse.redirect(`${origin}/login?error=invalid_oauth`);
    clearOauthStartCookies(res);
    return res;
  }

  if (!code) {
    const res = NextResponse.redirect(`${origin}/login?error=invalid_oauth`);
    clearOauthStartCookies(res);
    return res;
  }

  try {
    const redirectUri = buildGoogleOAuthRedirectUri(origin);
    const oauth2 = createOAuth2Client(redirectUri);
    const { tokens } = await oauth2.getToken(code);
    logOAuthGetTokenResult(tokens);

    if (tokens.scope && !scopeIncludesBlogger(tokens.scope)) {
      console.warn(
        "[oauth/callback] tokens.scope không chứa Blogger — kiểm tra cấu hình phạm vi / Google Cloud."
      );
    }

    if (!tokens.refresh_token) {
      console.log(
        "[oauth/callback] Không có refresh_token — lần ủy quyền đầu mới thường có; thử gỡ app khỏi tài khoản Google rồi login lại."
      );
      const res = NextResponse.redirect(`${origin}/login?error=no_refresh_token`);
      clearOauthStartCookies(res);
      return res;
    }

    oauth2.setCredentials(tokens);
    const oauth2Api = google.oauth2({ version: "v2", auth: oauth2 });
    const userInfo = await oauth2Api.userinfo.get();
    logOAuthUserInfoResult(userInfo);
    const email = normalizeAccountEmail(userInfo.data.email);
    if (!email) {
      const res = NextResponse.redirect(`${origin}/login?error=no_email`);
      clearOauthStartCookies(res);
      return res;
    }

    const expired = tokens.expiry_date
      ? new Date(tokens.expiry_date)
      : new Date(Date.now() + 3_600_000);

    await connectDb();
    const scope = typeof tokens.scope === "string" ? tokens.scope.trim() : "";
    // Một email = một bản ghi: update theo email (so khớp không phân biệt hoa thường) hoặc tạo mới nếu chưa có.
    await AccountApi.findOneAndUpdate(
      { email },
      {
        $set: {
          email,
          refreshToken: tokens.refresh_token,
          accessToken: tokens.access_token ?? "",
          expired,
          scope,
        },
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true,
        collation: { locale: "en", strength: 2 },
      }
    );

    logOAuthCallbackSuccess({
      email,
      redirectTo: `${origin}/?connected=1`,
    });

    const res = NextResponse.redirect(`${origin}/?connected=1`);
    clearOauthStartCookies(res);
    return res;
  } catch (err) {
    logOAuthCallbackError("token_exchange", err);
    const res = NextResponse.redirect(`${origin}/login?error=token_exchange`);
    clearOauthStartCookies(res);
    return res;
  }
}

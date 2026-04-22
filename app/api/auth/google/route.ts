import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import {
  getOAuthPublicOrigin,
  OAUTH_PUBLIC_ORIGIN_COOKIE,
} from "@/lib/env";
import { buildGoogleOAuthRedirectUri, createOAuth2Client } from "@/lib/google-auth";
import { generateWebServerAuthUrl } from "@/lib/google-oauth-web";
import { logOAuthGoogleStart } from "@/lib/oauth-debug-log";

const oauthCookie = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 600,
  path: "/",
};

/**
 * Tương đương `app.get('/', ...)` trong mẫu: state + `generateAuthUrl` + `res.redirect`.
 * `redirect_uri` dựng động từ từng request (`origin` + path callback), không cấu hình tĩnh.
 * @see https://developers.google.com/identity/protocols/oauth2/web-server?hl=vi#node.js_2
 */
export async function GET(request: Request) {
  const origin = getOAuthPublicOrigin(request);
  if (!process.env.GOOGLE_CLIENT_ID?.trim() || !process.env.GOOGLE_CLIENT_SECRET?.trim()) {
    return NextResponse.redirect(`${origin}/login?error=oauth_config`);
  }

  const redirectUri = buildGoogleOAuthRedirectUri(origin);
  const oauth2 = createOAuth2Client(redirectUri);
  const state = randomBytes(32).toString("hex");

  const authUrl = generateWebServerAuthUrl(oauth2, state, redirectUri);

  logOAuthGoogleStart({
    origin,
    redirectUri,
    state,
    authUrl,
  });

  const res = NextResponse.redirect(authUrl);
  res.cookies.set("oauth_state", state, oauthCookie);
  res.cookies.set(OAUTH_PUBLIC_ORIGIN_COOKIE, origin, oauthCookie);
  return res;
}

/**
 * Log luồng OAuth (dev / khi bật OAUTH_DEBUG_LOG) — xem redirect về có gì, origin, query.
 * Không log full `code` trên production trừ khi OAUTH_DEBUG_LOG=1|true.
 */

function verboseOAuthLog(): boolean {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.OAUTH_DEBUG_LOG === "1" ||
    process.env.OAUTH_DEBUG_LOG === "true"
  );
}

export function logOAuthGoogleStart(payload: {
  origin: string;
  redirectUri: string;
  state: string;
  authUrl: string;
}): void {
  const v = verboseOAuthLog();
  console.log(
    "[oauth/google] GET → redirect Google",
    v
      ? {
          origin: payload.origin,
          redirectUri: payload.redirectUri,
          state: payload.state,
          authUrl: payload.authUrl,
        }
      : {
          origin: payload.origin,
          redirectUri: payload.redirectUri,
          stateLength: payload.state.length,
        }
  );
}

export function logOAuthCallbackIncoming(
  request: Request,
  origin: string
): void {
  const url = new URL(request.url);
  const raw = Object.fromEntries(url.searchParams.entries());
  const v = verboseOAuthLog();
  const searchParams = v
    ? raw
    : {
        ...raw,
        ...(raw.code
          ? { code: `[redacted, length=${raw.code.length}]` }
          : {}),
      };

  console.log("[oauth/callback] GET Google redirect về", {
    method: request.method,
    fullUrl: url.toString(),
    pathname: url.pathname,
    originComputed: origin,
    searchParams,
    headers: {
      host: request.headers.get("host"),
      "x-forwarded-host": request.headers.get("x-forwarded-host"),
      "x-forwarded-proto": request.headers.get("x-forwarded-proto"),
      referer: request.headers.get("referer"),
    },
  });
}

export function logOAuthCallbackValidation(payload: {
  hasCode: boolean;
  stateFromQuery: string | null;
  cookieState: string | undefined;
  stateMatch: boolean;
}): void {
  const v = verboseOAuthLog();
  if (v) {
    console.log("[oauth/callback] kiểm tra state / code", {
      hasCode: payload.hasCode,
      stateMatch: payload.stateMatch,
      stateFromQuery: payload.stateFromQuery,
      cookieState: payload.cookieState,
    });
  } else {
    console.log("[oauth/callback] kiểm tra state / code", {
      hasCode: payload.hasCode,
      stateMatch: payload.stateMatch,
      stateFromQueryLen: payload.stateFromQuery?.length ?? 0,
      cookieStateLen: payload.cookieState?.length ?? 0,
    });
  }
}

export function logOAuthCallbackSuccess(payload: {
  email: string;
  redirectTo: string;
}): void {
  console.log("[oauth/callback] OK — lưu token, redirect", payload);
}

/** Phản hồi từ `oauth2.getToken(code)` — dev / OAUTH_DEBUG_LOG: full `tokens`; production: bỏ secret. */
export function logOAuthGetTokenResult(tokens: {
  access_token?: string | null;
  refresh_token?: string | null;
  scope?: string | null;
  token_type?: string | null;
  expiry_date?: number | null;
  id_token?: string | null;
}): void {
  if (verboseOAuthLog()) {
    console.log("[oauth/callback] res getToken()", tokens);
  } else {
    console.log("[oauth/callback] res getToken() (redacted)", {
      has_access_token: Boolean(tokens.access_token),
      has_refresh_token: Boolean(tokens.refresh_token),
      has_id_token: Boolean(tokens.id_token),
      scope: tokens.scope,
      token_type: tokens.token_type,
      expiry_date: tokens.expiry_date,
    });
  }
}

/**
 * Phản hồi từ `google.oauth2({ v2 }).userinfo.get()`.
 * Trên dev / OAUTH_DEBUG_LOG thêm cả `headers` phản hồi.
 */
export function logOAuthUserInfoResult(res: {
  status?: number;
  statusText?: string;
  data?: object | null;
  headers?: object;
}): void {
  const base = {
    status: res.status,
    statusText: res.statusText,
    data: res.data,
  };
  if (verboseOAuthLog() && res.headers) {
    console.log("[oauth/callback] res userinfo.get()", { ...base, headers: res.headers });
  } else {
    console.log("[oauth/callback] res userinfo.get()", base);
  }
}

export function logOAuthCallbackError(
  phase: "token_exchange" | "unexpected",
  err: unknown
): void {
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;
  console.error(`[oauth/callback] Lỗi (${phase}):`, message);
  if (verboseOAuthLog() && stack) {
    console.error(stack);
  }
}

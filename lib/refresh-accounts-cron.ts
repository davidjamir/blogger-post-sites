import { connectDb } from "./db";
import { getAppBaseUrl } from "./env";
import { AccountApi, type IAccountApi } from "./models";
import {
  type CronRefreshResult,
  buildGoogleOAuthRedirectUri,
  createOAuth2Client,
} from "./google-auth";

type Lean = IAccountApi & { _id?: unknown };

/**
 * Một tài khoản: dùng refresh_token lấy access mới, cập nhật DB nếu refresh.
 * Dùng cho cron lọc theo `expired` (còn ≤ N phút hoặc đã hết hạn).
 */
export async function refreshOneAccount(
  cred: Lean
): Promise<CronRefreshResult> {
  const email = cred.email;
  const oauth2 = createOAuth2Client(
    buildGoogleOAuthRedirectUri(getAppBaseUrl())
  );
  const now = Date.now();
  const expiresAt = new Date(cred.expired).getTime();
  const hasRefresh = Boolean(cred.refreshToken?.trim());
  if (!hasRefresh) {
    if (now >= expiresAt - 60_000) {
      return {
        ok: false,
        error: "Không có refresh token, access hết hạn",
      };
    }
    return {
      ok: true,
      email,
      refreshed: false,
      accessExpiresAtIso: new Date(cred.expired).toISOString(),
    };
  }
  oauth2.setCredentials({
    refresh_token: cred.refreshToken,
    access_token: cred.accessToken,
    expiry_date: expiresAt,
  });
  if (!cred.accessToken || now >= expiresAt - 60_000) {
    const { credentials } = await oauth2.refreshAccessToken();
    const newAccess = credentials.access_token;
    const newExpiry = credentials.expiry_date
      ? new Date(credentials.expiry_date)
      : new Date(now + 3600_000);
    if (!newAccess) {
      return { ok: false, error: "Google không trả access_token" };
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
    await AccountApi.updateOne({ email }, { $set: update });
    const iso = newExpiry.toISOString();
    return {
      ok: true,
      email,
      refreshed: true,
      accessExpiresAtIso: iso,
    };
  }
  const iso = new Date(cred.expired).toISOString();
  return {
    ok: true,
    email,
    refreshed: false,
    accessExpiresAtIso: iso,
  };
}

/**
 * Tất cả bản ghi có `expired` **trước hoặc tại** (now + withinMinutes) — tức còn tối đa
 * `withinMinutes` phút nữa là hết hạn **hoặc** đã hết hạn.
 * Lần lượt refresh và lưu access mới.
 */
export async function refreshAccountsExpiringWithinWindow(options: {
  withinMinutes: number;
  maxAccounts: number;
}): Promise<{
  withinMinutes: number;
  maxAccounts: number;
  totalMatched: number;
  results: Array<
    (CronRefreshResult & { email: string }) | { email: string; error: string }
  >;
}> {
  const { withinMinutes, maxAccounts } = options;
  await connectDb();
  const deadline = new Date(Date.now() + withinMinutes * 60_000);
  const list = await AccountApi.find({
    refreshToken: { $exists: true, $nin: [null, ""] },
    expired: { $lte: deadline },
  })
    .sort({ expired: 1 })
    .limit(maxAccounts)
    .lean();

  const results: Array<
    (CronRefreshResult & { email: string }) | { email: string; error: string }
  > = [];
  for (const cred of list) {
    if (!("email" in cred) || !cred.email) {
      continue;
    }
    try {
      const r = await refreshOneAccount(cred as Lean);
      if (r.ok) {
        results.push(r);
      } else {
        results.push({ email: cred.email, error: r.error });
      }
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      results.push({ email: String(cred.email), error: err });
    }
  }
  return {
    withinMinutes,
    maxAccounts,
    totalMatched: list.length,
    results,
  };
}

export function defaultCronMaxAccounts(): number {
  const raw = process.env.CRON_MAX_ACCOUNTS;
  if (raw && /^\d+$/.test(raw)) {
    const n = parseInt(raw, 10);
    if (n > 0) {
      return Math.min(n, 5000);
    }
  }
  return 200;
}

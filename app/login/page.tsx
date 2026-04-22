import type { Metadata } from "next";
import { headers } from "next/headers";
import { getOAuthPublicOriginFromHeaders } from "@/lib/env";
import { LoginClient } from "./LoginClient";

export const metadata: Metadata = {
  title: "Đăng nhập | Blogger Post Sites",
  description: "OAuth Google (Blogger) + MongoDB",
};

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: PageProps) {
  const sp = (await searchParams) ?? {};
  const raw = sp.error;
  const errorKey =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  const h = await headers();
  const publicOrigin = getOAuthPublicOriginFromHeaders(h);

  return <LoginClient errorKey={errorKey} publicOrigin={publicOrigin} />;
}

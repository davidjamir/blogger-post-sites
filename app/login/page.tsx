import type { Metadata } from "next";
import { headers } from "next/headers";
import { LoginClient } from "./LoginClient";

export const metadata: Metadata = {
  title: "Đăng nhập | Blogger Post Sites",
  description: "OAuth Google (Blogger) + MongoDB",
};

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

async function getPublicOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) {
    return "";
  }
  const rawProto = h.get("x-forwarded-proto");
  const proto =
    rawProto?.split(",")[0]?.trim() ||
    (host.includes("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`.replace(/\/$/, "");
}

export default async function LoginPage({ searchParams }: PageProps) {
  const sp = (await searchParams) ?? {};
  const raw = sp.error;
  const errorKey =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  const publicOrigin = await getPublicOrigin();

  return <LoginClient errorKey={errorKey} publicOrigin={publicOrigin} />;
}

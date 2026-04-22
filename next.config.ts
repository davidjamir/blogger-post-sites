import type { NextConfig } from "next";

/**
 * @see https://nextjs.org/docs/app/api-reference/config/next-config-js/allowedDevOrigins
 */
const devTunnelHosts = ["*.ngrok-free.app", "*.ngrok.io"] as const;

const nextConfig: NextConfig = {
  /** Dev qua ngrok / host khác localhost — tránh tải /_next bị chặn. Thêm IP LAN tại đây nếu cần. */
  allowedDevOrigins: [...devTunnelHosts],
};

export default nextConfig;

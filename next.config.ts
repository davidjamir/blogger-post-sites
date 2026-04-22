import type { NextConfig } from "next";

/**
 * Thêm từng host khi bạn dùng tunnel (ngrok đổi subdomain thì sửa / thêm ở đây).
 * @see https://nextjs.org/docs/app/api-reference/config/next-config-js/allowedDevOrigins
 */
const devTunnelHosts = [
  "turtle-neat-closely.ngrok-free.app",
  "*.ngrok-free.app",
  "*.ngrok.io",
  "192.168.68.105",
] as const;

const nextConfig: NextConfig = {
  /** Tài ngĩa /_next/* khi mở dev qua IP LAN hoặc ngrok (khác origin với “máy chủ dev nội bộ”). */
  allowedDevOrigins: [...devTunnelHosts],

  /**
   * RSC / Server Actions gửi từ trình duyệt: CSRF mặc định so khớp origin.
   * Reverse proxy (ngrok) cần cho phép host công khai, không thì lỡ load → “client-side exception”.
   */
  experimental: {
    serverActions: {
      allowedOrigins: [
        "localhost:3000",
        "127.0.0.1:3000",
        ...devTunnelHosts,
      ],
    },
  },
};

export default nextConfig;

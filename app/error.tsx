"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <main className="page" style={{ maxWidth: 640, margin: "0 auto", padding: "2rem" }}>
      <h1 style={{ fontSize: "1.25rem", marginBottom: "0.75rem" }}>
        Có lỗi khi tải trang
      </h1>
      <p style={{ color: "var(--muted, #6b7280)", marginBottom: "1rem" }}>
        {error.message || "Lỗi phía trình duyệt. Mở DevTools → Console để xem chi tiết."}
      </p>
      {process.env.NODE_ENV === "development" && error.digest != null && (
        <p style={{ fontSize: "0.85rem", color: "var(--muted, #6b7280)" }}>
          digest: {error.digest}
        </p>
      )}
      <button
        type="button"
        onClick={reset}
        style={{
          padding: "0.5rem 1rem",
          borderRadius: 8,
          border: "1px solid rgba(255,255,255,0.2)",
          background: "var(--surface, #1a1a1a)",
          color: "var(--text, #fff)",
          cursor: "pointer",
        }}
      >
        Thử lại
      </button>
    </main>
  );
}

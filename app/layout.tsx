import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

/** Khớp `globals.css` — tránh màn hình trắng lúc CSS/font chưa tải (FOUC). */
const initialBg = "#0a0e14";
const initialText = "#e8edf4";

const fontSans = Plus_Jakarta_Sans({
  subsets: ["latin", "vietnamese"],
  variable: "--font-sans",
  display: "swap",
});

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Blogger Post Sites",
  description: "OAuth Blogger + MongoDB + cron",
};

export const viewport: Viewport = {
  themeColor: initialBg,
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${fontSans.variable} ${fontMono.variable}`}
      style={{ backgroundColor: initialBg, color: initialText }}
    >
      <body
        className={fontSans.className}
        style={{ backgroundColor: initialBg, color: initialText, minHeight: "100%" }}
      >
        {children}
      </body>
    </html>
  );
}

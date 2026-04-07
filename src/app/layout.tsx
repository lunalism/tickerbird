import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// 기본 메타데이터 설정 (각 페이지에서 title을 지정하면 template 형식으로 표시)
export const metadata: Metadata = {
  title: {
    template: "%s | Tickerbird",
    default: "Tickerbird",
  },
  description: "AI 기반 한국·미국 주식 금융 뉴스 분석 플랫폼",
  // 파비콘 설정 (SVG 로고 사용)
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

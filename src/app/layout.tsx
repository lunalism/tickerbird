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
  // OG 이미지 등 상대 경로의 기준 URL
  metadataBase: new URL("https://tickerbird.me"),
  title: {
    template: "%s | Tickerbird",
    default: "Tickerbird",
  },
  description: "AI 기반 한국·미국 주식 금융 뉴스 분석 플랫폼",
  keywords: [
    "주식",
    "금융뉴스",
    "한국주식",
    "미국주식",
    "KOSPI",
    "NASDAQ",
    "AI뉴스분석",
    "투자정보",
  ],
  // Open Graph (카카오톡, 슬랙 등 SNS 공유 미리보기)
  openGraph: {
    title: "Tickerbird - AI 주식 금융 뉴스 분석",
    description: "AI 기반 한국·미국 주식 금융 뉴스 분석 플랫폼",
    url: "https://tickerbird.me",
    siteName: "Tickerbird",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
    locale: "ko_KR",
    type: "website",
  },
  // Twitter (X) 카드
  twitter: {
    card: "summary_large_image",
    title: "Tickerbird - AI 주식 금융 뉴스 분석",
    description: "AI 기반 한국·미국 주식 금융 뉴스 분석 플랫폼",
    images: ["/opengraph-image"],
  },
  // 검색엔진 크롤링 설정
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
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
    // Dark Reader 등 브라우저 확장이 <html> 태그에 style 속성을 주입하여
    // 발생하는 hydration mismatch 경고를 억제한다.
    // 이 속성은 <html> 자신과 직계 자식 텍스트에만 적용되며,
    // <body> 내부의 실제 hydration 버그는 여전히 감지된다.
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

/**
 * 루트 레이아웃 컴포넌트
 *
 * ============================================================
 * PWA (Progressive Web App) 설정:
 * ============================================================
 * - manifest.json 링크
 * - Apple Touch Icon
 * - 테마 컬러
 * - iOS Safari 전체화면 모드
 *
 * ============================================================
 * SEO 메타데이터:
 * ============================================================
 * - Open Graph
 * - Twitter Card
 * - 아이콘
 */

import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider, ToastProvider, AuthProvider, PriceAlertProvider } from "@/components/providers";
import { OfflineIndicator } from "@/components/common";

// ==================== 메타데이터 설정 ====================

export const metadata: Metadata = {
  // 기본 메타데이터
  title: "AlphaBoard - 글로벌 투자 정보 플랫폼",
  description: "실시간 글로벌 투자 정보와 분석을 제공하는 플랫폼. 주식, ETF, 암호화폐, 환율, 원자재 정보를 한눈에.",

  // 앱 이름 (PWA)
  applicationName: "AlphaBoard",

  // 키워드
  keywords: ["투자", "주식", "ETF", "암호화폐", "환율", "원자재", "금융", "트레이딩"],

  // 작성자
  authors: [{ name: "AlphaBoard Team" }],

  // 생성기
  generator: "Next.js",

  // PWA manifest
  manifest: "/manifest.json",

  // 아이콘 설정
  icons: {
    // Favicon
    icon: [
      { url: "/icons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    // Apple Touch Icon
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    // 기타 아이콘
    other: [
      { rel: "mask-icon", url: "/icons/icon-512x512.png", color: "#3b82f6" },
    ],
  },

  // Apple 관련 메타
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "AlphaBoard",
  },

  // 포맷 감지 비활성화
  formatDetection: {
    telephone: false,
  },

  // Open Graph
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "https://alphaboard-psi.vercel.app",
    siteName: "AlphaBoard",
    title: "AlphaBoard - 글로벌 투자 정보 플랫폼",
    description: "실시간 글로벌 투자 정보와 분석을 제공하는 플랫폼",
    images: [
      {
        url: "/icons/icon-512x512.png",
        width: 512,
        height: 512,
        alt: "AlphaBoard 로고",
      },
    ],
  },

  // Twitter Card
  twitter: {
    card: "summary_large_image",
    title: "AlphaBoard - 글로벌 투자 정보 플랫폼",
    description: "실시간 글로벌 투자 정보와 분석을 제공하는 플랫폼",
    images: ["/icons/icon-512x512.png"],
  },

  // 검색 엔진 크롤링 설정
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },

  // 기타 메타 정보
  category: 'finance',
};

// ==================== 뷰포트 설정 ====================

export const viewport: Viewport = {
  // 기본 뷰포트
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,

  // iOS Safari safe area
  viewportFit: 'cover',

  // 테마 컬러 (브라우저 UI 색상)
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
};

// ==================== 루트 레이아웃 ====================

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        {/* PWA 추가 메타 태그 */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="AlphaBoard" />

        {/* Microsoft 타일 */}
        <meta name="msapplication-TileColor" content="#3b82f6" />
        <meta name="msapplication-tap-highlight" content="no" />
      </head>
      <body className="antialiased">
        <ThemeProvider>
          <AuthProvider>
            <PriceAlertProvider>
              <ToastProvider />
              <OfflineIndicator />
              {children}
            </PriceAlertProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

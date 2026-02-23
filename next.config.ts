/**
 * Next.js 설정 파일
 *
 * ============================================================
 * PWA (Progressive Web App) 설정:
 * ============================================================
 * - @ducanh2912/next-pwa 사용
 * - Service Worker를 통한 오프라인 캐싱
 * - 정적 자산 및 API 응답 캐싱
 *
 * ============================================================
 * 이미지 최적화 설정:
 * ============================================================
 * - 외부 이미지 도메인 허용 목록
 */

import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

// PWA 설정 초기화
const withPWA = withPWAInit({
  // Service Worker 목적지
  dest: "public",

  // 개발 환경에서 PWA 비활성화
  disable: process.env.NODE_ENV === "development",

  // Service Worker 등록
  register: true,

  // 캐싱 설정
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,

  // Workbox 옵션
  workboxOptions: {
    disableDevLogs: true,
    // 런타임 캐싱 규칙
    runtimeCaching: [
      // 이미지 캐싱 (Cache First 전략)
      {
        urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
        handler: "CacheFirst",
        options: {
          cacheName: "images-cache",
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30일
          },
        },
      },
      // 폰트 캐싱 (Cache First 전략)
      {
        urlPattern: /\.(?:woff|woff2|ttf|otf|eot)$/i,
        handler: "CacheFirst",
        options: {
          cacheName: "fonts-cache",
          expiration: {
            maxEntries: 20,
            maxAgeSeconds: 365 * 24 * 60 * 60, // 1년
          },
        },
      },
      // 정적 자산 캐싱 (Stale While Revalidate 전략)
      {
        urlPattern: /\.(?:js|css)$/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "static-resources",
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 7 * 24 * 60 * 60, // 7일
          },
        },
      },
      // API 응답 캐싱 (Network First 전략)
      {
        urlPattern: /\/api\/.*/i,
        handler: "NetworkFirst",
        options: {
          cacheName: "api-cache",
          networkTimeoutSeconds: 10,
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 5 * 60, // 5분
          },
        },
      },
    ],
  },
});

// Next.js 기본 설정
const nextConfig: NextConfig = {
  // Turbopack 설정 (Next.js 16+ 호환)
  turbopack: {},

  /**
   * Firebase 인증 커스텀 도메인 프록시
   *
   * Google 로그인 시 "tickerbird.me(으)로 이동" 표시를 위해
   * /__/auth/* 경로를 Firebase 호스팅으로 프록시합니다.
   *
   * 참고: https://firebase.google.com/docs/auth/web/redirect-best-practices
   */
  async rewrites() {
    return [
      {
        source: '/__/auth/:path*',
        destination: 'https://alphaboard-web.firebaseapp.com/__/auth/:path*',
      },
    ];
  },

  // 이미지 최적화 - 외부 도메인 허용
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.brandfetch.io',
      },
      {
        protocol: 'https',
        hostname: 'asset.brandfetch.io',
      },
      {
        protocol: 'https',
        hostname: 'logos.brandfetch.com',
      },
      {
        protocol: 'https',
        hostname: 'hatscripts.github.io',
      },
      {
        protocol: 'https',
        hostname: 'logo.clearbit.com',
      },
    ],
  },
};

// PWA 설정 적용하여 내보내기
export default withPWA(nextConfig);

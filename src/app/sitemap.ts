/**
 * 사이트맵 생성
 *
 * 검색 엔진이 사이트 구조를 파악할 수 있도록 sitemap.xml을 자동 생성합니다.
 *
 * ============================================================
 * 접근 방법:
 * ============================================================
 * https://alphaboard-psi.vercel.app/sitemap.xml
 *
 * ============================================================
 * changeFrequency 설명:
 * ============================================================
 * - always: 매번 변경 (실시간 데이터)
 * - hourly: 매시간 변경
 * - daily: 매일 변경
 * - weekly: 매주 변경
 * - monthly: 매월 변경
 * - yearly: 매년 변경
 * - never: 변경 없음 (아카이브)
 *
 * ============================================================
 * priority 설명:
 * ============================================================
 * - 1.0: 최고 우선순위 (홈페이지)
 * - 0.8-0.9: 높은 우선순위 (주요 기능 페이지)
 * - 0.5-0.7: 중간 우선순위 (보조 페이지)
 * - 0.1-0.4: 낮은 우선순위 (정책, 약관 등)
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap
 */

import { MetadataRoute } from 'next';

/** 사이트 기본 URL */
const BASE_URL = 'https://alphaboard-psi.vercel.app';

/**
 * 사이트맵 생성 함수
 *
 * Next.js가 빌드 시 자동으로 /sitemap.xml 경로에 XML 파일을 생성합니다.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  // 현재 날짜 (lastModified 용)
  const now = new Date();

  return [
    // ========================================
    // 메인 페이지 (최고 우선순위)
    // ========================================
    {
      url: BASE_URL,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1,
    },

    // ========================================
    // 핵심 기능 페이지 (높은 우선순위)
    // ========================================
    {
      url: `${BASE_URL}/market`,
      lastModified: now,
      changeFrequency: 'always', // 실시간 시세
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/calendar`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/community`,
      lastModified: now,
      changeFrequency: 'hourly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/alerts`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/watchlist`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.7,
    },

    // ========================================
    // 보조 페이지 (중간 우선순위)
    // ========================================
    {
      url: `${BASE_URL}/search`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/glossary`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/announcements`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/faq`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },

    // ========================================
    // 정책 페이지 (낮은 우선순위)
    // ========================================
    {
      url: `${BASE_URL}/privacy`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/terms`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },

    // ========================================
    // 로그인/온보딩 (낮은 우선순위)
    // ========================================
    {
      url: `${BASE_URL}/login`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
  ];
}

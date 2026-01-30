/**
 * robots.txt 생성
 *
 * 검색 엔진 크롤러에게 크롤링 규칙을 알려줍니다.
 *
 * ============================================================
 * 접근 방법:
 * ============================================================
 * https://alphaboard-psi.vercel.app/robots.txt
 *
 * ============================================================
 * 규칙 설명:
 * ============================================================
 * - allow: 크롤링 허용 경로
 * - disallow: 크롤링 차단 경로
 * - sitemap: 사이트맵 위치
 *
 * ============================================================
 * 차단 경로:
 * ============================================================
 * - /admin/: 관리자 페이지 (비공개)
 * - /api/: API 엔드포인트 (불필요한 크롤링 방지)
 * - /profile: 사용자 프로필 (개인정보)
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots
 */

import { MetadataRoute } from 'next';

/** 사이트 기본 URL */
const BASE_URL = 'https://alphaboard-psi.vercel.app';

/**
 * robots.txt 생성 함수
 *
 * Next.js가 빌드 시 자동으로 /robots.txt 경로에 파일을 생성합니다.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        // 모든 검색 엔진 크롤러에 적용
        userAgent: '*',
        // 기본적으로 모든 경로 허용
        allow: '/',
        // 특정 경로 차단
        disallow: [
          '/admin/',      // 관리자 페이지
          '/api/',        // API 엔드포인트
          '/profile',     // 사용자 프로필
          '/onboarding',  // 온보딩 페이지
        ],
      },
      {
        // Googlebot 특별 규칙
        userAgent: 'Googlebot',
        allow: '/',
        disallow: [
          '/admin/',
          '/api/',
          '/profile',
        ],
      },
    ],
    // 사이트맵 위치 명시
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}

"use client";

import { useState } from "react";
import Image from "next/image";

/**
 * 통합 로고 컴포넌트
 * 기업 로고와 국기 이미지를 라운드 사각형 스타일로 통일되게 표시합니다.
 *
 * @param type - 로고 타입 ('company' | 'flag')
 * @param src - 이미지 소스 (company: 도메인, flag: 국가코드)
 * @param alt - 대체 텍스트
 * @param size - 로고 크기 ('xs' | 'sm' | 'md' | 'lg' | 'xl')
 * @param className - 추가 CSS 클래스
 *
 * @example
 * // 기업 로고
 * <Logo type="company" src="apple.com" alt="Apple" size="md" />
 *
 * // 국기
 * <Logo type="flag" src="us" alt="미국" size="md" />
 */

// 로고 타입 정의
type LogoType = 'company' | 'flag';

// 크기 타입 정의
type LogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface LogoProps {
  type: LogoType;
  src: string;
  alt?: string;
  size?: LogoSize;
  className?: string;
}

// 크기별 픽셀 값 매핑
const sizeMap: Record<LogoSize, number> = {
  xs: 24,  // 아주 작은 인라인 사용
  sm: 32,  // 테이블 행에서 사용 (관심종목, 시세)
  md: 40,  // 캘린더, 일반적인 사용
  lg: 48,  // 뉴스 카드에서 사용
  xl: 56,  // 상세 페이지
};

// 크기별 border-radius 매핑
const radiusMap: Record<LogoSize, string> = {
  xs: 'rounded-md',
  sm: 'rounded-lg',
  md: 'rounded-xl',
  lg: 'rounded-xl',
  xl: 'rounded-2xl',
};

/**
 * 기업 로고 URL 생성 (Brandfetch CDN)
 */
function getCompanyLogoUrl(domain: string): string {
  const clientId = process.env.NEXT_PUBLIC_BRANDFETCH_CLIENT_ID;
  // 256x256 고해상도 로고 요청
  return clientId
    ? `https://cdn.brandfetch.io/${domain}/w/256/h/256?c=${clientId}`
    : `https://cdn.brandfetch.io/${domain}/w/256/h/256`;
}

/**
 * 국기 이미지 URL 생성 (Circle Flags)
 */
function getFlagUrl(countryCode: string): string {
  return `https://hatscripts.github.io/circle-flags/flags/${countryCode.toLowerCase()}.svg`;
}

export function Logo({ type, src, alt = '', size = 'md', className = '' }: LogoProps) {
  const [error, setError] = useState(false);
  const pixelSize = sizeMap[size];
  const radius = radiusMap[size];

  // 이미지 URL 결정
  const imageUrl = type === 'company' ? getCompanyLogoUrl(src) : getFlagUrl(src);

  // 로드 실패 시 기본 아이콘 표시
  if (error) {
    return (
      <div
        className={`${radius} bg-gray-100 flex items-center justify-center flex-shrink-0 ${className}`}
        style={{ width: pixelSize, height: pixelSize }}
      >
        {type === 'company' ? (
          // 기업 로고 실패 시 빌딩 아이콘
          <svg
            className="text-gray-400"
            style={{ width: pixelSize * 0.5, height: pixelSize * 0.5 }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
        ) : (
          // 국기 실패 시 지구 아이콘
          <svg
            className="text-gray-400"
            style={{ width: pixelSize * 0.5, height: pixelSize * 0.5 }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        )}
      </div>
    );
  }

  // 국기: 원형 SVG를 확대해서 라운드 사각형으로 클리핑
  if (type === 'flag') {
    return (
      <div
        className={`
          ${radius}
          overflow-hidden
          flex-shrink-0
          bg-gray-100
          ${className}
        `}
        style={{ width: pixelSize, height: pixelSize }}
      >
        {/* 원형 국기를 140% 확대해서 사각형 컨테이너를 채움 */}
        <Image
          src={imageUrl}
          alt={alt || src}
          width={Math.round(pixelSize * 1.4)}
          height={Math.round(pixelSize * 1.4)}
          className="object-cover scale-[1.4]"
          style={{
            width: pixelSize,
            height: pixelSize,
            objectFit: 'cover'
          }}
          unoptimized
          onError={() => setError(true)}
        />
      </div>
    );
  }

  // 기업 로고: 여백 없이 꽉 채움
  return (
    <div
      className={`
        ${radius}
        bg-white
        border border-gray-100
        shadow-sm
        overflow-hidden
        flex-shrink-0
        ${className}
      `}
      style={{ width: pixelSize, height: pixelSize }}
    >
      <Image
        src={imageUrl}
        alt={alt || src}
        width={pixelSize}
        height={pixelSize}
        className="w-full h-full object-cover"
        unoptimized
        onError={() => setError(true)}
      />
    </div>
  );
}

/**
 * 기업 로고 전용 래퍼 컴포넌트
 * Logo 컴포넌트의 type="company" 단축 버전
 */
export function CompanyLogo({
  domain,
  alt,
  size = 'md',
  className = '',
}: {
  domain?: string;
  alt?: string;
  size?: LogoSize;
  className?: string;
}) {
  if (!domain) {
    const pixelSize = sizeMap[size];
    const radius = radiusMap[size];
    return (
      <div
        className={`${radius} bg-gray-100 flex items-center justify-center flex-shrink-0 ${className}`}
        style={{ width: pixelSize, height: pixelSize }}
      >
        <svg
          className="text-gray-400"
          style={{ width: pixelSize * 0.5, height: pixelSize * 0.5 }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
      </div>
    );
  }
  return <Logo type="company" src={domain} alt={alt || domain} size={size} className={className} />;
}

/**
 * 국기 전용 래퍼 컴포넌트
 * Logo 컴포넌트의 type="flag" 단축 버전
 */
export function FlagLogo({
  countryCode,
  alt,
  size = 'md',
  className = '',
}: {
  countryCode: string;
  alt?: string;
  size?: LogoSize;
  className?: string;
}) {
  return <Logo type="flag" src={countryCode} alt={alt || countryCode} size={size} className={className} />;
}

// 뉴스 카드 컴포넌트
// articles 테이블의 기사를 표시합니다.

"use client";

import { ExternalLink } from "lucide-react";

// 기사 타입 (articles 테이블과 동일)
export interface Article {
  id: string;
  title_ko: string;
  summary_ko: string;
  title_en: string;
  summary_en: string;
  source_url: string;
  source_name: string;
  country: "KR" | "US";
  published_at: string;
}

interface NewsCardProps {
  article: Article;
}

// 상대 시간 포맷 (n분 전, n시간 전, n일 전)
function formatRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / (1000 * 60));
  const diffHour = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDay = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMin < 60) return `${Math.max(1, diffMin)}분 전`;
  if (diffHour < 24) return `${diffHour}시간 전`;
  return `${diffDay}일 전`;
}

// 출처별 배지 스타일
function getSourceBadgeStyle(source: string): string {
  switch (source) {
    case "CNBC":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    case "MarketWatch":
      return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    case "Investing.com":
      return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
    case "Nasdaq":
      return "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400";
    case "네이버":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
    default:
      return "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400";
  }
}

// 국가 배지
function getCountryLabel(country: "KR" | "US"): string {
  return country === "KR" ? "🇰🇷 한국" : "🇺🇸 미국";
}

export default function NewsCard({ article }: NewsCardProps) {
  return (
    <a
      href={article.source_url}
      target="_blank"
      rel="noopener noreferrer"
      className="block cursor-pointer px-2 py-3 transition-colors hover:bg-accent/50"
    >
      {/* 첫째 줄: 출처 배지 + 국가 + 시간 */}
      <div className="mb-1.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {/* 출처 배지 */}
          <span
            className={`rounded px-1.5 py-0.5 text-xs font-medium ${getSourceBadgeStyle(article.source_name)}`}
          >
            {article.source_name}
          </span>
          {/* 국가 배지 */}
          <span className="text-xs text-muted-foreground">
            {getCountryLabel(article.country)}
          </span>
        </div>
        {/* 상대 시간 */}
        <span className="text-xs text-muted-foreground">
          {formatRelativeTime(article.published_at)}
        </span>
      </div>

      {/* 둘째 줄: 한국어 제목 */}
      <h3 className="mb-1.5 text-sm font-semibold leading-snug text-foreground">
        {article.title_ko}
      </h3>

      {/* 셋째 줄: 한국어 요약 (3줄) */}
      <p className="mb-2 text-xs leading-relaxed text-muted-foreground whitespace-pre-line">
        {article.summary_ko}
      </p>

      {/* 넷째 줄: 원문 링크 표시 */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground/70">
        <ExternalLink size={10} />
        <span>원문 보기</span>
      </div>
    </a>
  );
}

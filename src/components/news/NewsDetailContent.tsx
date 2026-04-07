// 뉴스 상세 콘텐츠 컴포넌트
// 모달과 풀페이지에서 공유하는 기사 상세 UI입니다.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import type { Article } from "@/components/news/NewsCard";

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

// 상대 시간 포맷
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

interface NewsDetailContentProps {
  article: Article;
  relatedArticles: Article[];
}

export default function NewsDetailContent({
  article,
  relatedArticles,
}: NewsDetailContentProps) {
  const router = useRouter();
  // 원문 보기 토글 상태
  const [isOriginalOpen, setIsOriginalOpen] = useState(false);

  return (
    <div className="space-y-5">
      {/* 상단: 출처 배지 + 국가 + 발행 시간 */}
      <div className="flex items-center gap-2">
        <span
          className={`rounded px-1.5 py-0.5 text-xs font-medium ${getSourceBadgeStyle(article.source_name)}`}
        >
          {article.source_name}
        </span>
        <span className="text-xs text-muted-foreground">
          {article.country === "KR" ? "🇰🇷 한국" : "🇺🇸 미국"}
        </span>
        <span className="text-xs text-muted-foreground">
          {formatRelativeTime(article.published_at)}
        </span>
      </div>

      {/* 한국어 제목 */}
      <h1 className="text-xl font-bold leading-tight text-foreground">
        {article.title_ko}
      </h1>

      {/* 한국어 요약 3줄 */}
      <div className="space-y-1.5">
        {article.summary_ko.split("\n").map((line, i) => (
          <p key={i} className="text-sm leading-relaxed text-muted-foreground">
            • {line}
          </p>
        ))}
      </div>

      {/* 원문 보기 토글 */}
      <div>
        <button
          onClick={() => setIsOriginalOpen(!isOriginalOpen)}
          className="flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          {isOriginalOpen ? (
            <>
              원문 접기 <ChevronUp size={14} />
            </>
          ) : (
            <>
              원문 보기 <ChevronDown size={14} />
            </>
          )}
        </button>

        {isOriginalOpen && (
          <div className="mt-3 space-y-3 border-t border-border pt-3">
            {/* 영어 제목 */}
            <h2 className="text-base font-semibold text-muted-foreground">
              {article.title_en}
            </h2>

            {/* 영어 요약 3줄 */}
            <div className="space-y-1.5">
              {article.summary_en.split("\n").map((line, i) => (
                <p
                  key={i}
                  className="text-sm leading-relaxed text-muted-foreground/80"
                >
                  • {line}
                </p>
              ))}
            </div>

            {/* 원문 링크 */}
            <a
              href={article.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground transition-colors hover:text-foreground/80"
            >
              <ExternalLink size={14} />
              {article.source_name}에서 전체 기사 읽기 →
            </a>
          </div>
        )}
      </div>

      {/* 관련 뉴스 */}
      {relatedArticles.length > 0 && (
        <div className="border-t border-border pt-4">
          <h3 className="mb-3 text-sm font-bold text-foreground">관련 뉴스</h3>
          <div className="space-y-2">
            {relatedArticles.map((related) => (
              <button
                key={related.id}
                onClick={() => router.push(`/news/${related.id}`)}
                className="block w-full rounded-md px-3 py-2 text-left transition-colors hover:bg-accent/50"
              >
                <div className="mb-0.5 flex items-center gap-1.5">
                  <span
                    className={`rounded px-1 py-0.5 text-[10px] font-medium ${getSourceBadgeStyle(related.source_name)}`}
                  >
                    {related.source_name}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatRelativeTime(related.published_at)}
                  </span>
                </div>
                <p className="text-sm font-medium text-foreground">
                  {related.title_ko}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

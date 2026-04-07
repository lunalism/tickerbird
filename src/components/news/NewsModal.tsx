// 뉴스 모달 컴포넌트
// Zustand selectedArticle을 구독하여 모달을 즉시 표시합니다.
// 서버 라운드트립 없이 순수 클라이언트에서 동작합니다.

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { X, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { useNewsStore } from "@/stores/newsStore";
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

export default function NewsModal() {
  const selectedArticle = useNewsStore((s) => s.selectedArticle);
  const allArticles = useNewsStore((s) => s.allArticles);
  const setSelectedArticle = useNewsStore((s) => s.setSelectedArticle);

  // 원문 보기 토글 상태
  const [isOriginalOpen, setIsOriginalOpen] = useState(false);

  // 모달 닫기
  const handleClose = useCallback(() => {
    setSelectedArticle(null);
    setIsOriginalOpen(false);
  }, [setSelectedArticle]);

  // ESC 키 닫기 + 배경 스크롤 방지
  useEffect(() => {
    if (!selectedArticle) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [selectedArticle, handleClose]);

  // 관련 뉴스 3개 (같은 country, 현재 기사 제외, 최신순)
  const relatedArticles = useMemo(() => {
    if (!selectedArticle) return [];
    return allArticles
      .filter(
        (a) =>
          a.country === selectedArticle.country &&
          a.id !== selectedArticle.id
      )
      .slice(0, 3);
  }, [selectedArticle, allArticles]);

  // 관련 뉴스 클릭
  const handleRelatedClick = (article: Article) => {
    setIsOriginalOpen(false);
    setSelectedArticle(article);
  };

  // selectedArticle이 null이면 아무것도 렌더링하지 않음
  if (!selectedArticle) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 반투명 오버레이 */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* 모달 박스 */}
      <div className="relative z-10 mx-4 max-h-[85vh] w-full max-w-[600px] overflow-y-auto rounded-xl border border-border bg-background p-6 shadow-xl">
        {/* 닫기 버튼 */}
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="닫기"
        >
          <X size={18} />
        </button>

        <div className="space-y-5">
          {/* 상단: 출처 배지 + 국가 + 발행 시간 */}
          <div className="flex items-center gap-2">
            <span
              className={`rounded px-1.5 py-0.5 text-xs font-medium ${getSourceBadgeStyle(selectedArticle.source_name)}`}
            >
              {selectedArticle.source_name}
            </span>
            <span className="text-xs text-muted-foreground">
              {selectedArticle.country === "KR" ? "🇰🇷 한국" : "🇺🇸 미국"}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatRelativeTime(selectedArticle.published_at)}
            </span>
          </div>

          {/* 한국어 제목 */}
          <h1 className="text-xl font-bold leading-tight text-foreground">
            {selectedArticle.title_ko}
          </h1>

          {/* 한국어 요약 3줄 */}
          <div className="space-y-1.5">
            {selectedArticle.summary_ko.split("\n").map((line, i) => (
              <p
                key={i}
                className="text-sm leading-relaxed text-muted-foreground"
              >
                • {line}
              </p>
            ))}
          </div>

          {/* 한국 뉴스: 바로 외부 링크 표시 / 미국 뉴스: 원문 보기 토글 */}
          {selectedArticle.country === "KR" ? (
            <a
              href={selectedArticle.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground transition-colors hover:text-foreground/80"
            >
              <ExternalLink size={14} />
              {selectedArticle.source_name}에서 전체 기사 읽기 →
            </a>
          ) : (
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
                  <h2 className="text-base font-semibold text-muted-foreground">
                    {selectedArticle.title_en}
                  </h2>
                  <div className="space-y-1.5">
                    {selectedArticle.summary_en.split("\n").map((line, i) => (
                      <p
                        key={i}
                        className="text-sm leading-relaxed text-muted-foreground/80"
                      >
                        • {line}
                      </p>
                    ))}
                  </div>
                  <a
                    href={selectedArticle.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground transition-colors hover:text-foreground/80"
                  >
                    <ExternalLink size={14} />
                    {selectedArticle.source_name}에서 전체 기사 읽기 →
                  </a>
                </div>
              )}
            </div>
          )}

          {/* 관련 뉴스 */}
          {relatedArticles.length > 0 && (
            <div className="border-t border-border pt-4">
              <h3 className="mb-3 text-sm font-bold text-foreground">
                관련 뉴스
              </h3>
              <div className="space-y-2">
                {relatedArticles.map((related) => (
                  <button
                    key={related.id}
                    onClick={() => handleRelatedClick(related)}
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
      </div>
    </div>
  );
}

// 페이지별 고유 로딩 애니메이션 컴포넌트
// variant prop으로 페이지마다 다른 애니메이션을 표시합니다.

"use client";

import { useEffect, useState } from "react";

type LoadingVariant =
  | "news"
  | "reports"
  | "community"
  | "calendar"
  | "admin"
  | "default";

interface PageLoadingProps {
  variant?: LoadingVariant;
}

// ──────────────────────────────────────────────
// 뉴스: 속보 타이핑 애니메이션
// ──────────────────────────────────────────────

const NEWS_MESSAGES = [
  "오늘 새로운 소식이 들어오나?",
  "시장은 지금 어떻게 돌아가고 있을까?",
  "트럼프가 또 뭔가 올렸으려나...",
  "코스피 오늘은 올랐을까?",
  "잠깐, 속보가 들어오고 있어!",
];

function NewsLoading() {
  const [messageIndex, setMessageIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  const currentMessage = NEWS_MESSAGES[messageIndex];

  useEffect(() => {
    if (!isDeleting && charIndex < currentMessage.length) {
      // 타이핑 중 (55ms/글자)
      const timer = setTimeout(() => setCharIndex((c) => c + 1), 55);
      return () => clearTimeout(timer);
    }

    if (!isDeleting && charIndex === currentMessage.length) {
      // 타이핑 완료 → 잠시 대기 후 삭제 시작
      const timer = setTimeout(() => setIsDeleting(true), 1200);
      return () => clearTimeout(timer);
    }

    if (isDeleting && charIndex > 0) {
      // 삭제 중 (25ms/글자)
      const timer = setTimeout(() => setCharIndex((c) => c - 1), 25);
      return () => clearTimeout(timer);
    }

    if (isDeleting && charIndex === 0) {
      // 삭제 완료 → 다음 문구로
      setIsDeleting(false);
      setMessageIndex((i) => (i + 1) % NEWS_MESSAGES.length);
    }
  }, [charIndex, isDeleting, currentMessage]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5">
      {/* 속보 배지 (깜빡이는 점 포함) */}
      <div className="flex items-center gap-2">
        <span className="relative flex items-center gap-1.5 rounded bg-red-500 px-2.5 py-1 text-xs font-bold text-white">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
          </span>
          속보
        </span>
      </div>

      {/* 타이핑 텍스트 + 커서 */}
      <div className="h-8 flex items-center">
        <p className="text-sm text-foreground font-medium">
          {currentMessage.slice(0, charIndex)}
          <span className="ml-0.5 inline-block w-0.5 h-4 bg-foreground animate-pulse" />
        </p>
      </div>

      {/* 본문 스켈레톤 바 (채워졌다 사라짐) */}
      <div className="w-64 space-y-2">
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-muted-foreground/20 rounded-full"
            style={{
              animation: "fillBar 2s ease-in-out infinite",
            }}
          />
        </div>
        <div className="h-2 w-3/4 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-muted-foreground/20 rounded-full"
            style={{
              animation: "fillBar 2s ease-in-out infinite 0.3s",
            }}
          />
        </div>
      </div>

      {/* 스켈레톤 바 애니메이션 */}
      <style>{`
        @keyframes fillBar {
          0%, 100% { width: 0%; }
          50% { width: 100%; }
        }
      `}</style>
    </div>
  );
}

// ──────────────────────────────────────────────
// 리포트: 바 차트 애니메이션
// ──────────────────────────────────────────────

function ReportsLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5">
      {/* 바 차트 4개 */}
      <div className="flex items-end gap-3 h-24">
        {[60, 85, 45, 70].map((height, i) => (
          <div
            key={i}
            className="w-6 rounded-t bg-blue-500/70 dark:bg-blue-400/70"
            style={{
              animation: `barGrow 1.2s ease-out infinite alternate`,
              animationDelay: `${i * 0.15}s`,
              height: `${height}%`,
            }}
          />
        ))}
      </div>
      <p className="text-sm text-muted-foreground">리포트를 분석하는 중...</p>

      <style>{`
        @keyframes barGrow {
          0% { transform: scaleY(0.3); opacity: 0.4; }
          100% { transform: scaleY(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ──────────────────────────────────────────────
// 커뮤니티: 말풍선 애니메이션
// ──────────────────────────────────────────────

function CommunityLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5">
      {/* 말풍선 3개 순서대로 나타남 */}
      <div className="space-y-3 w-56">
        {["안녕하세요!", "오늘 시장 어때요?", "좋은 정보 감사합니다"].map(
          (text, i) => (
            <div
              key={i}
              className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}
              style={{
                animation: "bubbleIn 0.4s ease-out forwards",
                animationDelay: `${i * 0.5}s`,
                opacity: 0,
              }}
            >
              <div
                className={`rounded-2xl px-3 py-1.5 text-xs max-w-[70%] ${
                  i % 2 === 0
                    ? "bg-muted text-foreground rounded-bl-sm"
                    : "bg-blue-500 text-white rounded-br-sm"
                }`}
              >
                {text}
              </div>
            </div>
          )
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        커뮤니티를 불러오는 중...
      </p>

      <style>{`
        @keyframes bubbleIn {
          0% { transform: translateY(10px) scale(0.8); opacity: 0; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ──────────────────────────────────────────────
// 캘린더: 날짜 숫자 애니메이션
// ──────────────────────────────────────────────

function CalendarLoading() {
  const dates = [1, 5, 12, 15, 20, 23, 28, 8, 17];

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5">
      {/* 3x3 날짜 그리드 */}
      <div className="grid grid-cols-3 gap-2">
        {dates.map((date, i) => (
          <div
            key={i}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-border text-sm font-medium text-foreground"
            style={{
              animation: "dateAppear 0.3s ease-out forwards",
              animationDelay: `${i * 0.1}s`,
              opacity: 0,
            }}
          >
            {date}
          </div>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">일정을 확인하는 중...</p>

      <style>{`
        @keyframes dateAppear {
          0% { transform: scale(0); opacity: 0; }
          70% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ──────────────────────────────────────────────
// 관리자: 카운팅 애니메이션
// ──────────────────────────────────────────────

function AdminLoading() {
  const [counts, setCounts] = useState([0, 0, 0]);
  const targets = [128, 2450, 47]; // 유저, 뉴스, 게시물 목표 숫자
  const labels = ["유저", "뉴스", "게시물"];

  useEffect(() => {
    const duration = 1500; // 1.5초 동안 카운팅
    const steps = 30;
    const interval = duration / steps;

    let step = 0;
    const timer = setInterval(() => {
      step++;
      setCounts(
        targets.map((target) =>
          Math.round((target * Math.min(step, steps)) / steps)
        )
      );
      if (step >= steps) clearInterval(timer);
    }, interval);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5">
      {/* 카운팅 카드 3개 */}
      <div className="flex gap-4">
        {counts.map((count, i) => (
          <div
            key={i}
            className="flex flex-col items-center gap-1 rounded-lg border border-border bg-card px-5 py-3"
          >
            <span className="text-2xl font-bold tabular-nums text-foreground">
              {count.toLocaleString()}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {labels[i]}
            </span>
          </div>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">데이터를 집계하는 중...</p>
    </div>
  );
}

// ──────────────────────────────────────────────
// 기본: 원형 스피너
// ──────────────────────────────────────────────

function DefaultLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="relative">
        <div className="w-12 h-12 rounded-full border-4 border-gray-200 dark:border-gray-700" />
        <div className="absolute inset-0 w-12 h-12 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
      </div>
      <p className="text-sm text-muted-foreground">불러오는 중...</p>
    </div>
  );
}

// ──────────────────────────────────────────────
// 메인 컴포넌트
// ──────────────────────────────────────────────

export default function PageLoading({ variant = "default" }: PageLoadingProps) {
  switch (variant) {
    case "news":
      return <NewsLoading />;
    case "reports":
      return <ReportsLoading />;
    case "community":
      return <CommunityLoading />;
    case "calendar":
      return <CalendarLoading />;
    case "admin":
      return <AdminLoading />;
    default:
      return <DefaultLoading />;
  }
}

// TradingView 경제 캘린더 위젯 (클라이언트 컴포넌트)
// iframe 임베드 방식으로 주간 달력뷰를 표시합니다.
// (script 주입 방식보다 훨씬 단순하고 React 라이프사이클과 자연스럽게 어울림)

"use client";

import { useUIStore } from "@/stores/uiStore";

/** TradingView events 위젯의 iframe 임베드 베이스 URL */
const TRADINGVIEW_EVENTS_IFRAME_BASE =
  "https://s.tradingview.com/embed-widget/events/?locale=kr";

export default function EconomicCalendarWidget() {
  // 다크모드 상태 (uiStore에서 구독 — 토글 시 src 재계산되어 iframe 자동 교체)
  const isDarkMode = useUIStore((state) => state.isDarkMode);

  // iframe URL 설정값 — encodeURIComponent(JSON.stringify(...))로 hash fragment 구성
  // (TradingView 임베드 위젯이 # 뒤의 JSON을 파싱해 옵션으로 사용)
  const config = {
    colorTheme: isDarkMode ? "dark" : "light",
    isTransparent: false,
    width: "100%",
    height: "100%",
    // 중요도 필터: 모두 표시 (낮음~높음)
    importanceFilter: "-1,0,1,2,3",
    // 국가 필터: 한국 + 주요국
    countryFilter: "kr,us,cn,jp,eu,gb",
  };
  const src = `${TRADINGVIEW_EVENTS_IFRAME_BASE}#${encodeURIComponent(
    JSON.stringify(config)
  )}`;

  return (
    // 헤더(h-14=56px)와 탭바(h-16=64px)를 제외한 풀 높이로 위젯 표시
    // - 모바일: 100dvh - 헤더 - 탭바
    // - 데스크탑(md 이상): 사이드바 외 풀 높이
    <div className="h-[calc(100dvh-3.5rem-4rem)] w-full md:h-[100dvh]">
      <iframe
        src={src}
        title="경제 캘린더"
        style={{ width: "100%", height: "100%", border: "none" }}
        allowTransparency={true}
      />
    </div>
  );
}

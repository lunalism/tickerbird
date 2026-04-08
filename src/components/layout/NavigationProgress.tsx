// 페이지 이동 시 상단 프로그레스 바를 표시합니다.
// NProgress 라이브러리를 사용하여 라우트 변경을 감지합니다.

"use client";

import { useEffect, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import NProgress from "nprogress";

// NProgress 초기 설정 (스피너 비활성화)
NProgress.configure({ showSpinner: false });

// NProgress 스타일 커스텀 (Tickerbird 브랜드 파란색)
const progressStyles = `
  #nprogress {
    pointer-events: none;
  }
  #nprogress .bar {
    background: #2563eb;
    position: fixed;
    z-index: 9999;
    top: 0;
    left: 0;
    width: 100%;
    height: 3px;
  }
  #nprogress .peg {
    display: block;
    position: absolute;
    right: 0;
    width: 100px;
    height: 100%;
    box-shadow: 0 0 10px #2563eb, 0 0 5px #2563eb;
    opacity: 1;
    transform: rotate(3deg) translate(0px, -4px);
  }
`;

// useSearchParams를 사용하므로 Suspense로 감싸야 합니다
function NavigationProgressInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 라우트 변경 완료 시 프로그레스 바 종료
  useEffect(() => {
    NProgress.done();
  }, [pathname, searchParams]);

  return <style>{progressStyles}</style>;
}

export default function NavigationProgress() {
  return (
    <Suspense>
      <NavigationProgressInner />
    </Suspense>
  );
}

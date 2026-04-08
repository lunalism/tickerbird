// 동적 OG 이미지 생성 (Next.js ImageResponse)
// SNS 공유 시 미리보기 카드에 표시되는 이미지를 서버에서 생성합니다.

import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Tickerbird - AI 주식 금융 뉴스 분석";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0f172a",
          gap: "24px",
        }}
      >
        {/* 로고 텍스트 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <span style={{ fontSize: "64px" }}>🐦</span>
          <span
            style={{
              fontSize: "56px",
              fontWeight: 800,
              color: "#ffffff",
              letterSpacing: "-1px",
            }}
          >
            Tickerbird
          </span>
        </div>

        {/* 설명 텍스트 */}
        <p
          style={{
            fontSize: "24px",
            color: "#94a3b8",
            margin: 0,
          }}
        >
          AI 기반 한국·미국 주식 금융 뉴스 분석 플랫폼
        </p>

        {/* 도메인 */}
        <p
          style={{
            fontSize: "18px",
            color: "#64748b",
            margin: 0,
            marginTop: "24px",
          }}
        >
          tickerbird.me
        </p>
      </div>
    ),
    { ...size }
  );
}

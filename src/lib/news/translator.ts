// Gemini 2.5 Flash-Lite 를 사용한 한/영 뉴스 번역 및 요약 모듈
// REST API 직접 호출로 외부 SDK 의존성을 최소화합니다.

import type { RawArticle, TranslatedArticle, RawTrumpPost } from "./types";

const GEMINI_MODEL = "gemini-2.5-flash-lite";
const BATCH_SIZE = 5;

// 지정된 시간(ms)만큼 대기하는 유틸. RPM 한도 회피용.
// Gemini Flash-Lite 무료 티어는 15 RPM 이므로 batch 사이
// 최소 4초 간격이 안전선. 여기서는 1초 마진 더해 5초 사용.
const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

// batch 사이 대기 시간(ms). 변경 시 RPM 한도 재검토 필요.
const BATCH_INTERVAL_MS = 5000;

// 영어 기사용 프롬프트
const EN_PROMPT = `다음 영어 뉴스 기사 제목들을 처리해줘.
각 기사에 대해 JSON 배열로 응답해줘.
- title_ko: 자연스러운 한국어 제목
- summary_ko: 한국 투자자 관점의 3줄 요약 (한국어, 각 줄은 \\n으로 구분)
- title_en: 원문 제목 그대로
- summary_en: 3줄 요약 (영어, 각 줄은 \\n으로 구분)
JSON 배열만 반환하고 다른 텍스트는 포함하지 마.`;

// 한국어 기사용 프롬프트
const KR_PROMPT = `다음 한국어 뉴스 기사 제목들을 처리해줘.
각 기사에 대해 JSON 배열로 응답해줘.
- title_ko: 원문 제목 그대로
- summary_ko: 3줄 요약 (한국어, 각 줄은 \\n으로 구분)
- title_en: 자연스러운 영어 제목
- summary_en: 3줄 요약 (영어, 각 줄은 \\n으로 구분)
JSON 배열만 반환하고 다른 텍스트는 포함하지 마.`;

// 트럼프 게시물 번역/요약 프롬프트
const TRUMP_PROMPT = `다음 트럼프 Truth Social 게시물을 처리해줘.
각 게시물에 대해 JSON 배열로 응답해줘.
- content_ko: 자연스러운 한국어 번역
- summary_ko: 한국 투자자 관점의 시장 영향 3줄 요약 (한국어, \\n 구분)
JSON 배열만 반환하고 다른 텍스트는 포함하지 마.`;

/**
 * Gemini 2.5 Flash-Lite 호출 헬퍼.
 * 무료 티어: 15 RPM / 1000 RPD / 250K TPM
 * Tickerbird 사용량 (일 ~576 회) 은 무료 한도의 57% 수준.
 * REST API 직접 호출로 의존성을 최소화합니다.
 */
async function callGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY 환경변수가 설정되지 않았습니다");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const requestInit: RequestInit = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3, // 번역 일관성을 위해 낮게 설정
        maxOutputTokens: 4096, // 기존 Anthropic max_tokens 와 동일
        responseMimeType: "application/json", // 순수 JSON 만 반환하도록 강제
      },
    }),
  };

  // 429 응답 시 Retry-After 헤더 기반 1회 재시도.
  // Gemini Flash-Lite 의 일시적 RPM 초과 시 자동 회복 목적.
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await fetch(url, requestInit);

    if (response.status === 429 && attempt === 0) {
      // Retry-After 헤더는 보통 초 단위 정수.
      // 없으면 보수적으로 10초 대기 (RPM 윈도우 60초의 1/6).
      const retryAfter = parseInt(
        response.headers.get("retry-after") ?? "10",
        10
      );
      const waitMs = Math.min(retryAfter * 1000, 30000); // 최대 30초
      console.warn(
        `Gemini 429 응답, ${waitMs}ms 후 재시도 (attempt ${attempt + 1})`
      );
      await sleep(waitMs);
      continue;
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API 오류: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text || typeof text !== "string") {
      throw new Error("Gemini 응답에서 텍스트를 추출하지 못했습니다");
    }
    return text;
  }

  throw new Error("Gemini API 재시도 후에도 실패");
}

/** 기사 배열을 BATCH_SIZE씩 나눕니다 */
function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/** 단일 배치를 Gemini로 번역/요약합니다 */
async function translateBatch(
  articles: RawArticle[],
  country: "KR" | "US"
): Promise<TranslatedArticle[]> {
  const prompt = country === "US" ? EN_PROMPT : KR_PROMPT;

  // 제목 목록을 번호 매겨서 전달
  const titlesText = articles
    .map((a, i) => `${i + 1}. ${a.title}`)
    .join("\n");

  // Gemini 2.5 Flash-Lite 로 번역 호출
  const rawText = await callGemini(`${prompt}\n\n${titlesText}`);

  // JSON 배열 파싱 (responseMimeType=application/json 이지만 안전망으로 마크다운 코드블록 제거 유지)
  const jsonStr = rawText.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  const parsed: Array<{
    title_ko: string;
    summary_ko: string;
    title_en: string;
    summary_en: string;
  }> = JSON.parse(jsonStr);

  // 원본 기사 메타데이터와 결합
  return parsed.map((item, i) => ({
    title_ko: item.title_ko,
    summary_ko: item.summary_ko,
    title_en: item.title_en,
    summary_en: item.summary_en,
    source_url: articles[i].url,
    source_name: articles[i].sourceName,
    country: articles[i].country,
    published_at: articles[i].publishedAt,
  }));
}

/** 트럼프 게시물 배치를 Gemini로 번역/요약합니다 */
async function translateTrumpBatch(
  posts: RawTrumpPost[]
): Promise<Array<{ post_id: string; content_ko: string; summary_ko: string }>> {
  const contentsText = posts
    .map((p, i) => `${i + 1}. ${p.content}`)
    .join("\n");

  // Gemini 2.5 Flash-Lite 로 번역 호출
  const rawText = await callGemini(`${TRUMP_PROMPT}\n\n${contentsText}`);

  const jsonStr = rawText.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  const parsed: Array<{ content_ko: string; summary_ko: string }> =
    JSON.parse(jsonStr);

  return parsed.map((item, i) => ({
    post_id: posts[i].post_id,
    content_ko: item.content_ko,
    summary_ko: item.summary_ko,
  }));
}

/** 트럼프 게시물을 배치로 나누어 번역/요약합니다 */
export async function translateTrumpPosts(
  posts: RawTrumpPost[]
): Promise<Array<{ post_id: string; content_ko: string; summary_ko: string }>> {
  const batches = chunk(posts, BATCH_SIZE);
  const results: Array<{ post_id: string; content_ko: string; summary_ko: string }> = [];

  // RPM 한도 회피를 위해 batch 사이 sleep 삽입.
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    try {
      const translated = await translateTrumpBatch(batch);
      results.push(...translated);
    } catch (error) {
      // (재처리 마커는 trump_posts 스키마 미검증으로 보류)
      console.error("트럼프 게시물 번역 배치 처리 실패:", error);
    }
    // 마지막 batch 가 아니면 RPM 한도 회피용 대기.
    if (i < batches.length - 1) {
      await sleep(BATCH_INTERVAL_MS);
    }
  }

  return results;
}

/** 전체 기사를 배치로 나누어 번역/요약합니다 */
export async function translateArticles(
  articles: RawArticle[]
): Promise<TranslatedArticle[]> {
  // 한국/미국 기사를 분리
  const krArticles = articles.filter((a) => a.country === "KR");
  const usArticles = articles.filter((a) => a.country === "US");

  const results: TranslatedArticle[] = [];

  // 각 국가별로 배치 처리.
  // RPM 한도 회피를 위해 batch 사이 / 국가 사이 sleep 삽입.
  const countries = [
    ["KR", krArticles],
    ["US", usArticles],
  ] as const;

  for (let c = 0; c < countries.length; c++) {
    const [country, countryArticles] = countries[c];
    const batches = chunk(countryArticles, BATCH_SIZE);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      try {
        const translated = await translateBatch(batch, country);
        results.push(...translated);
      } catch (error) {
        // JSON 파싱 실패 또는 Gemini 호출 실패 시 해당 배치 스킵.
        // (재처리 마커는 articles 테이블 스키마 미지원으로 보류)
        console.error(`번역 배치 처리 실패 (${country}):`, error);
      }
      // 마지막 batch 가 아니면 RPM 한도 회피용 대기.
      if (i < batches.length - 1) {
        await sleep(BATCH_INTERVAL_MS);
      }
    }

    // KR 종료 후 US 시작 전 RPM 윈도우 분리.
    if (c < countries.length - 1) {
      await sleep(BATCH_INTERVAL_MS);
    }
  }

  return results;
}

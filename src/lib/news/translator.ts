// Gemini 2.5 Flash-Lite 를 사용한 한/영 뉴스 번역 및 요약 모듈
// REST API 직접 호출로 외부 SDK 의존성을 최소화합니다.

import type { RawArticle, TranslatedArticle, RawTrumpPost } from "./types";

const GEMINI_MODEL = "gemini-2.5-flash-lite";
const BATCH_SIZE = 5;

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

  const response = await fetch(url, {
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
  });

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

  for (const batch of batches) {
    try {
      const translated = await translateTrumpBatch(batch);
      results.push(...translated);
    } catch (error) {
      console.error("트럼프 게시물 번역 배치 처리 실패:", error);
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

  // 각 국가별로 배치 처리
  for (const [country, countryArticles] of [
    ["KR", krArticles],
    ["US", usArticles],
  ] as const) {
    const batches = chunk(countryArticles, BATCH_SIZE);

    for (const batch of batches) {
      try {
        const translated = await translateBatch(batch, country);
        results.push(...translated);
      } catch (error) {
        // JSON 파싱 실패 시 해당 배치 스킵
        console.error(`번역 배치 처리 실패 (${country}):`, error);
      }
    }
  }

  return results;
}

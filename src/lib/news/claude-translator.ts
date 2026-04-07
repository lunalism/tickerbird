// Claude API를 사용한 뉴스 번역 및 요약 생성
// claude-haiku-4-5 모델을 사용하여 비용을 최적화합니다.

import Anthropic from "@anthropic-ai/sdk";
import type { RawArticle, TranslatedArticle } from "./types";

const MODEL = "claude-haiku-4-5-20251001";
const BATCH_SIZE = 5;

const client = new Anthropic();

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

/** 기사 배열을 BATCH_SIZE씩 나눕니다 */
function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/** 단일 배치를 Claude로 번역/요약합니다 */
async function translateBatch(
  articles: RawArticle[],
  country: "KR" | "US"
): Promise<TranslatedArticle[]> {
  const prompt = country === "US" ? EN_PROMPT : KR_PROMPT;

  // 제목 목록을 번호 매겨서 전달
  const titlesText = articles
    .map((a, i) => `${i + 1}. ${a.title}`)
    .join("\n");

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `${prompt}\n\n${titlesText}`,
      },
    ],
  });

  // 응답에서 텍스트 추출
  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  // JSON 배열 파싱 (마크다운 코드블록 제거)
  const jsonStr = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
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

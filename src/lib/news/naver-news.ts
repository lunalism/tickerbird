// 네이버 뉴스 검색 API를 통한 한국 경제 뉴스 수집
// 4개 키워드를 병렬 검색 후 URL 기준 중복을 제거합니다.

import type { RawArticle } from "./types";

// 검색 키워드 목록
const KEYWORDS = ["경제", "주식", "코스피", "환율"];

const NAVER_API_URL = "https://openapi.naver.com/v1/search/news.json";

/** HTML 태그를 제거합니다 (<b>, </b> 등) */
function stripHtmlTags(text: string): string {
  return text.replace(/<[^>]*>/g, "").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
}

/** 단일 키워드로 네이버 뉴스를 검색합니다 */
async function searchByKeyword(keyword: string): Promise<RawArticle[]> {
  const params = new URLSearchParams({
    query: keyword,
    display: "10",
    sort: "date",
  });

  const response = await fetch(`${NAVER_API_URL}?${params}`, {
    headers: {
      "X-Naver-Client-Id": process.env.NAVER_CLIENT_ID!,
      "X-Naver-Client-Secret": process.env.NAVER_CLIENT_SECRET!,
    },
  });

  if (!response.ok) {
    throw new Error(`네이버 API 실패: ${keyword} (${response.status})`);
  }

  const data = await response.json();

  return (data.items ?? []).map(
    (item: { title: string; link: string; pubDate: string }) => ({
      title: stripHtmlTags(item.title),
      url: item.link,
      publishedAt: item.pubDate,
      sourceName: "네이버",
      country: "KR" as const,
    })
  );
}

/** 4개 키워드를 병렬 검색 후 URL 기준 중복을 제거합니다 */
export async function fetchNaverNews(): Promise<RawArticle[]> {
  const results = await Promise.allSettled(
    KEYWORDS.map((keyword) => searchByKeyword(keyword))
  );

  // URL 기준 중복 제거
  const seen = new Map<string, RawArticle>();

  for (const result of results) {
    if (result.status === "fulfilled") {
      for (const article of result.value) {
        if (!seen.has(article.url)) {
          seen.set(article.url, article);
        }
      }
    } else {
      // 키워드 하나 실패해도 나머지는 계속 진행
      console.error("네이버 뉴스 검색 실패:", result.reason);
    }
  }

  return Array.from(seen.values());
}

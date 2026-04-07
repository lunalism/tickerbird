// 네이버 뉴스 검색 API를 통한 한국 경제 뉴스 수집
// 4개 키워드를 병렬 검색 후 URL 기준 중복을 제거합니다.
// admin_settings의 차단 언론사 목록으로 필터링합니다.

import { createClient } from "@supabase/supabase-js";
import type { RawArticle } from "./types";

// 검색 키워드 목록
const KEYWORDS = ["증시", "코스피", "환율", "금리"];

const NAVER_API_URL = "https://openapi.naver.com/v1/search/news.json";

// 네이버 API 응답 아이템 타입
interface NaverNewsItem {
  title: string;
  link: string;
  description: string;
  originallink: string;
  pubDate: string;
}

// 불필요한 기사 제목 패턴 (인사, 부고, 광고 등)
const BLOCKED_TITLE_PATTERNS = [
  "[인사]", "[포토]", "[날씨]", "[부고]",
  "[공고]", "[안내]", "[모집]", "[채용]",
  "[광고]", "[협찬]", "[PR]",
  "부고", "빈소", "별세", "영면",
];

/** HTML 태그를 제거합니다 (<b>, </b> 등) */
function stripHtmlTags(text: string): string {
  return text.replace(/<[^>]*>/g, "").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
}

/** Supabase에서 차단 언론사 목록을 조회합니다 */
async function getBlockedSources(): Promise<string[]> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
      .from("admin_settings")
      .select("value")
      .eq("key", "blocked_news_sources")
      .single();

    if (error || !data) return [];

    // jsonb 컬럼은 Supabase JS가 이미 파싱된 상태로 반환합니다
    return Array.isArray(data.value) ? data.value : [];
  } catch {
    console.error("[뉴스수집] 차단 언론사 목록 조회 실패");
    return [];
  }
}

/** 차단 언론사에 해당하는 기사인지 확인합니다 */
function isBlockedArticle(item: NaverNewsItem, blockedSources: string[]): boolean {
  if (blockedSources.length === 0) return false;

  const title = stripHtmlTags(item.title);
  const description = stripHtmlTags(item.description);

  // title과 description에서 차단 언론사명 포함 여부 확인
  return blockedSources.some(
    (source) => title.includes(source) || description.includes(source)
  );
}

/** 단일 키워드로 네이버 뉴스를 검색합니다 */
async function searchByKeyword(
  keyword: string,
  blockedSources: string[]
): Promise<{ articles: RawArticle[]; blockedCount: number }> {
  const params = new URLSearchParams({
    query: keyword,
    display: "5",
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
  const items: NaverNewsItem[] = data.items ?? [];

  // 차단 언론사 필터링
  let blockedCount = 0;
  const filteredItems = items.filter((item) => {
    if (isBlockedArticle(item, blockedSources)) {
      blockedCount++;
      return false;
    }
    return true;
  });

  // 제목 패턴 필터링 (인사, 부고, 광고 등 제외)
  const articles = filteredItems
    .map((item) => ({
      title: stripHtmlTags(item.title),
      url: item.link,
      publishedAt: item.pubDate,
      sourceName: "네이버",
      country: "KR" as const,
    }))
    .filter(
      (article) =>
        !BLOCKED_TITLE_PATTERNS.some((pattern) =>
          article.title.includes(pattern)
        )
    );

  return { articles, blockedCount };
}

/** 4개 키워드를 병렬 검색 후 URL 기준 중복을 제거합니다 */
export async function fetchNaverNews(): Promise<RawArticle[]> {
  // 차단 언론사 목록 먼저 조회
  const blockedSources = await getBlockedSources();

  const results = await Promise.allSettled(
    KEYWORDS.map((keyword) => searchByKeyword(keyword, blockedSources))
  );

  // URL 기준 중복 제거
  const seen = new Map<string, RawArticle>();
  let totalBlocked = 0;

  for (const result of results) {
    if (result.status === "fulfilled") {
      totalBlocked += result.value.blockedCount;
      for (const article of result.value.articles) {
        if (!seen.has(article.url)) {
          seen.set(article.url, article);
        }
      }
    } else {
      // 키워드 하나 실패해도 나머지는 계속 진행
      console.error("네이버 뉴스 검색 실패:", result.reason);
    }
  }

  // 차단 결과 로그 출력
  if (totalBlocked > 0) {
    const sourceList = blockedSources[0] + (blockedSources.length > 1 ? ` 외 ${blockedSources.length - 1}개` : "");
    console.log(`[뉴스수집] 차단된 기사: ${totalBlocked}개 (차단 언론사: ${sourceList})`);
  }

  return Array.from(seen.values());
}

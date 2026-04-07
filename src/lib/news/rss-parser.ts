// RSS 피드 파싱 유틸리티 (서버사이드 전용)
// CNBC, MarketWatch, Investing.com 3개 소스를 병렬로 수집합니다.

import type { RawArticle } from "./types";

// 지원하는 RSS 소스 목록
const RSS_SOURCES = [
  {
    name: "CNBC",
    url: "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114",
  },
  {
    name: "MarketWatch",
    url: "https://feeds.content.dowjones.io/public/rss/mw_realtimeheadlines",
  },
  {
    name: "Investing.com",
    url: "https://www.investing.com/rss/news.rss",
  },
  {
    name: "Nasdaq",
    url: "https://www.nasdaq.com/feed/rssoutbound?category=Original+Articles",
  },
] as const;

// 각 소스당 최대 수집 아이템 수
const MAX_ITEMS_PER_SOURCE = 10;

/** HTML 엔티티를 디코딩합니다 */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

/** CDATA 블록을 언래핑합니다 */
function unwrapCdata(text: string): string {
  return text.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
}

/** XML에서 특정 태그의 내용을 추출합니다 */
function extractTag(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`);
  const match = xml.match(regex);
  if (!match) return "";
  return decodeHtmlEntities(unwrapCdata(match[1].trim()));
}

/** 단일 RSS 소스에서 기사를 수집합니다 */
async function fetchSource(
  name: string,
  url: string
): Promise<RawArticle[]> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; TickerBird/1.0)",
    },
  });

  if (!response.ok) {
    throw new Error(`RSS fetch 실패: ${name} (${response.status})`);
  }

  const xml = await response.text();

  // <item> 블록을 정규식으로 추출
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  const articles: RawArticle[] = [];
  let match: RegExpExecArray | null;

  while (
    (match = itemRegex.exec(xml)) !== null &&
    articles.length < MAX_ITEMS_PER_SOURCE
  ) {
    const itemXml = match[1];
    const title = extractTag(itemXml, "title");
    const link = extractTag(itemXml, "link");
    const pubDate = extractTag(itemXml, "pubDate");

    if (title && link) {
      articles.push({
        title,
        url: link,
        publishedAt: pubDate || new Date().toISOString(),
        sourceName: name,
        country: "US",
      });
    }
  }

  return articles;
}

/** 모든 RSS 소스에서 기사를 병렬 수집합니다 */
export async function fetchRssFeeds(): Promise<RawArticle[]> {
  const results = await Promise.allSettled(
    RSS_SOURCES.map((source) => fetchSource(source.name, source.url))
  );

  const articles: RawArticle[] = [];

  for (const result of results) {
    if (result.status === "fulfilled") {
      articles.push(...result.value);
    } else {
      // 소스 하나 실패해도 나머지는 계속 진행
      console.error("RSS 소스 수집 실패:", result.reason);
    }
  }

  return articles;
}

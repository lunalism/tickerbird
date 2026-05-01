// 뉴스 수집 핵심 로직
// /api/news/collect (Cron)과 /api/admin/collect (관리자 수동)에서 공유합니다.
// 인증은 각 route handler에서 처리하고, 이 함수는 수집/번역/저장만 담당합니다.

import { createClient } from "@supabase/supabase-js";
import { fetchRssFeeds } from "@/lib/news/rss-parser";
import { fetchNaverNews } from "@/lib/news/naver-news";
import { fetchTrumpPosts } from "@/lib/news/trump-posts";
import { translateArticles, translateTrumpPosts } from "@/lib/news/translator";
import type { RawArticle, TranslatedArticle } from "@/lib/news/types";

// 지정된 시간(ms)만큼 대기하는 유틸. Gemini RPM 한도 회피용.
const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

// 수집 결과 타입
export interface CollectResult {
  success: boolean;
  collected: number;
  saved: number;
  trump_saved: number;
  error?: string;
}

/** RSS + 네이버 + 트럼프 게시물을 수집하고 번역/저장합니다 */
export async function collectNews(): Promise<CollectResult> {
  // 1. RSS 수집
  let rssArticles: RawArticle[] = [];
  try {
    rssArticles = await fetchRssFeeds();
    console.log(`RSS 수집 완료: ${rssArticles.length}건`);
  } catch (error) {
    console.error("RSS 수집 전체 실패:", error);
  }

  // 2. 네이버 API 수집
  let naverArticles: RawArticle[] = [];
  try {
    naverArticles = await fetchNaverNews();
    console.log(`네이버 뉴스 수집 완료: ${naverArticles.length}건`);
  } catch (error) {
    console.error("네이버 뉴스 수집 전체 실패:", error);
  }

  // 3. 전체 합치기 + URL 기준 중복 제거
  const allArticles = [...rssArticles, ...naverArticles];
  const seen = new Map<string, RawArticle>();
  for (const article of allArticles) {
    if (!seen.has(article.url)) {
      seen.set(article.url, article);
    }
  }
  const uniqueArticles = Array.from(seen.values());
  console.log(`중복 제거 후: ${uniqueArticles.length}건`);

  if (uniqueArticles.length === 0) {
    return { success: true, collected: 0, saved: 0, trump_saved: 0 };
  }

  // 4. Claude 번역/요약 (실패 시 원문으로 저장)
  let translated: TranslatedArticle[];
  try {
    translated = await translateArticles(uniqueArticles);
    console.log(`번역 완료: ${translated.length}건`);
  } catch (error) {
    console.error("번역 실패, 원문으로 저장:", error);
    // 번역 실패 시 원문 데이터를 TranslatedArticle 형식으로 변환
    translated = uniqueArticles.map((a) => ({
      title_ko: a.title,
      summary_ko: "(번역 실패)",
      title_en: a.title,
      summary_en: "(translation failed)",
      source_url: a.url,
      source_name: a.sourceName,
      country: a.country,
      published_at: a.publishedAt,
    }));
  }

  // 5. Supabase upsert (service_role 사용)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from("articles")
    .upsert(translated, { onConflict: "source_url" })
    .select("id");

  if (error) {
    console.error("Supabase upsert 실패:", error);
    return {
      success: false,
      collected: uniqueArticles.length,
      saved: 0,
      trump_saved: 0,
      error: error.message,
    };
  }

  const savedCount = data?.length ?? 0;
  console.log(`기사 저장 완료: ${savedCount}건`);

  // 6. 트럼프 Truth Social 게시물 수집
  let trumpSaved = 0;
  try {
    const rawTrumpPosts = await fetchTrumpPosts();
    console.log(`트럼프 게시물 수집 완료: ${rawTrumpPosts.length}건`);

    if (rawTrumpPosts.length > 0) {
      // translateArticles 직후 곧바로 트럼프 번역 시작하면 RPM 누적.
      // 윈도우 분리를 위해 5초 대기.
      await sleep(5000);
      const translatedTrump = await translateTrumpPosts(rawTrumpPosts);
      console.log(`트럼프 게시물 번역 완료: ${translatedTrump.length}건`);

      const trumpRows = rawTrumpPosts.map((post) => {
        const tr = translatedTrump.find((t) => t.post_id === post.post_id);
        return {
          post_id: post.post_id,
          content: post.content,
          content_ko: tr?.content_ko ?? null,
          summary_ko: tr?.summary_ko ?? null,
          post_url: post.post_url,
          posted_at: post.posted_at,
        };
      });

      const { data: trumpData, error: trumpError } = await supabase
        .from("trump_posts")
        .upsert(trumpRows, { onConflict: "post_id" })
        .select("id");

      if (trumpError) {
        console.error("트럼프 게시물 저장 실패:", trumpError);
      } else {
        trumpSaved = trumpData?.length ?? 0;
        console.log(`트럼프 게시물 저장 완료: ${trumpSaved}건`);
      }
    }
  } catch (error) {
    console.error("트럼프 게시물 수집 실패:", error);
  }

  return {
    success: true,
    collected: uniqueArticles.length,
    saved: savedCount,
    trump_saved: trumpSaved,
  };
}

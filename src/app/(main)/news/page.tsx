// 뉴스 페이지 (서버 컴포넌트)
// unstable_cache로 articles/trump_posts를 60초간 캐싱하여
// 페이지 로딩 속도를 개선합니다.

import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import NewsPageClient from "./NewsPageClient";
import NewsModal from "@/components/news/NewsModal";

export const metadata: Metadata = {
  title: "뉴스",
};

// 캐싱용 Supabase 클라이언트 (쿠키 미사용, anon key로 공개 데이터 조회)
function getPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// articles 캐시 (60초마다 재검증, 뉴스는 30분마다 수집되므로 충분)
const getCachedArticles = unstable_cache(
  async () => {
    const supabase = getPublicClient();
    const { data } = await supabase
      .from("articles")
      .select("*")
      .order("published_at", { ascending: false })
      .limit(50);
    return data ?? [];
  },
  ["articles"],
  { revalidate: 60 }
);

// trump_posts 캐시 (60초마다 재검증)
const getCachedTrumpPosts = unstable_cache(
  async () => {
    const supabase = getPublicClient();
    const { data } = await supabase
      .from("trump_posts")
      .select("*")
      .order("posted_at", { ascending: false })
      .limit(10);
    return data ?? [];
  },
  ["trump_posts"],
  { revalidate: 60 }
);

export default async function NewsPage() {
  // 로그인 여부 확인 (캐싱 불가 — 쿠키 의존)
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isLoggedIn = !!user;

  // 캐시된 데이터 병렬 조회 (60초 캐시, 사용자 무관)
  const [articles, trumpPosts] = await Promise.all([
    getCachedArticles(),
    getCachedTrumpPosts(),
  ]);

  // 비로그인 시 기사 10개로 제한
  const limitedArticles = isLoggedIn ? articles : articles.slice(0, 10);

  return (
    <>
      <NewsPageClient
        initialArticles={limitedArticles}
        initialTrumpPosts={trumpPosts}
        isLoggedIn={isLoggedIn}
      />
      <NewsModal />
    </>
  );
}

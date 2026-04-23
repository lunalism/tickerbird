// 뉴스 페이지 (서버 컴포넌트)
// 매 요청마다 Supabase 에서 최신 데이터를 조회합니다.
// 이전에 unstable_cache 로 60초 캐싱했으나 edge 환경에서 간헐적으로
// 오래된 데이터를 반환하는 버그가 있어 제거했습니다.

import type { Metadata } from "next";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import NewsPageClient from "./NewsPageClient";
import NewsModal from "@/components/news/NewsModal";

export const metadata: Metadata = {
  title: "뉴스",
  description:
    "오늘의 주요 금융 뉴스. AI가 분석한 한국·미국 주식 시장 핵심 뉴스를 한눈에.",
};

// 캐싱용 Supabase 클라이언트 (쿠키 미사용, anon key로 공개 데이터 조회)
function getPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// 최신 기사 50개 조회 (published_at 내림차순)
// 캐시를 제거하여 항상 최신 데이터를 반환한다.
// 뉴스는 최신성이 핵심이고, 인덱스 기반 단순 조회라 성능 영향 미미.
async function getArticles() {
  const supabase = getPublicClient();
  const { data } = await supabase
    .from("articles")
    .select("*")
    .order("published_at", { ascending: false })
    .limit(50);
  return data ?? [];
}

// 최신 트럼프 게시물 10개 조회 (posted_at 내림차순)
// 캐시 제거 이유는 getArticles 와 동일.
async function getTrumpPosts() {
  const supabase = getPublicClient();
  const { data } = await supabase
    .from("trump_posts")
    .select("*")
    .order("posted_at", { ascending: false })
    .limit(10);
  return data ?? [];
}

export default async function NewsPage() {
  // 로그인 여부 확인 (쿠키 의존)
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isLoggedIn = !!user;

  // 기사/트럼프 게시물 병렬 조회 (매 요청마다 최신 데이터)
  const [articles, trumpPosts] = await Promise.all([
    getArticles(),
    getTrumpPosts(),
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

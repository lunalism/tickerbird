// 뉴스 모달 페이지 (Intercepting Route)
// Zustand에서 selectedArticle을 바로 사용하여 즉시 표시합니다.
// 직접 URL 접근 시에는 클라이언트 Supabase로 fallback 조회합니다.

"use client";

import { useEffect, useState, use } from "react";
import { createClient } from "@/lib/supabase/client";
import { useNewsStore } from "@/stores/newsStore";
import NewsModal from "@/components/news/NewsModal";
import NewsDetailContent from "@/components/news/NewsDetailContent";
import type { Article } from "@/components/news/NewsCard";

export default function NewsModalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const selectedArticle = useNewsStore((s) => s.selectedArticle);

  // Zustand에 기사가 있으면 바로 사용, 없으면 Supabase fallback
  const [article, setArticle] = useState<Article | null>(
    selectedArticle?.id === id ? selectedArticle : null
  );
  const [relatedArticles, setRelatedArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(!article);

  // Zustand에 없거나 id 불일치 시 Supabase에서 조회
  useEffect(() => {
    if (article) {
      // 관련 뉴스만 조회
      fetchRelated(article.country, id);
      return;
    }

    const fetchArticle = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("articles")
        .select("*")
        .eq("id", id)
        .single();

      if (data) {
        setArticle(data);
        fetchRelated(data.country, id);
      }
      setIsLoading(false);
    };

    fetchArticle();
  }, [id]);

  // 관련 뉴스 3개 조회
  const fetchRelated = async (country: string, articleId: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("articles")
      .select("*")
      .eq("country", country)
      .neq("id", articleId)
      .order("published_at", { ascending: false })
      .limit(3);

    setRelatedArticles(data ?? []);
  };

  return (
    <NewsModal>
      {isLoading || !article ? (
        // 로딩 스피너
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        </div>
      ) : (
        <NewsDetailContent
          article={article}
          relatedArticles={relatedArticles}
        />
      )}
    </NewsModal>
  );
}

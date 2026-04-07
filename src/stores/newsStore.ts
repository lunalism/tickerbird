// 뉴스 전역 상태 관리
// 리스트에서 클릭한 기사를 모달에서 즉시 표시하기 위해 사용합니다.

import { create } from "zustand";
import type { Article } from "@/components/news/NewsCard";

interface NewsStore {
  // 현재 선택된 기사 (null이면 모달 닫힘)
  selectedArticle: Article | null;
  // 전체 기사 목록 (관련 뉴스 필터용)
  allArticles: Article[];
  // 기사 선택 (모달 열기)
  setSelectedArticle: (article: Article | null) => void;
  // 전체 기사 목록 설정
  setAllArticles: (articles: Article[]) => void;
}

export const useNewsStore = create<NewsStore>((set) => ({
  selectedArticle: null,
  allArticles: [],
  setSelectedArticle: (article) => set({ selectedArticle: article }),
  setAllArticles: (articles) => set({ allArticles: articles }),
}));

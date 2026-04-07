// 선택된 뉴스 아티클을 전역 상태로 관리
// 리스트에서 클릭한 기사를 모달에서 즉시 표시하기 위해 사용합니다.

import { create } from "zustand";
import type { Article } from "@/components/news/NewsCard";

interface NewsStore {
  // 현재 선택된 기사
  selectedArticle: Article | null;
  // 기사 선택 (모달 열기 전 호출)
  setSelectedArticle: (article: Article | null) => void;
}

export const useNewsStore = create<NewsStore>((set) => ({
  selectedArticle: null,
  setSelectedArticle: (article) => set({ selectedArticle: article }),
}));

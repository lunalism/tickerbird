// 뉴스 수집 공통 타입 정의

/** RSS/네이버에서 수집한 원본 기사 */
export type RawArticle = {
  title: string;
  url: string;
  publishedAt: string;
  sourceName: string;
  country: "KR" | "US";
};

/** Claude 번역/요약 완료된 기사 (Supabase 저장용) */
export type TranslatedArticle = {
  title_ko: string;
  summary_ko: string;
  title_en: string;
  summary_en: string;
  source_url: string;
  source_name: string;
  country: "KR" | "US";
  published_at: string;
};

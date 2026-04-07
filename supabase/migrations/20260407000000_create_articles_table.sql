-- ============================================
-- 뉴스 아티클 테이블 생성
-- 한국/미국 뉴스 피드를 저장하는 테이블
-- ============================================

-- 테이블 생성
CREATE TABLE articles (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title_ko      text        NOT NULL,   -- 한국어 번역 제목
  summary_ko    text        NOT NULL,   -- 한국어 3줄 요약
  title_en      text        NOT NULL,   -- 영어 원문 제목
  summary_en    text        NOT NULL,   -- 영어 3줄 요약
  source_url    text        NOT NULL UNIQUE,  -- 원본 기사 링크 (중복 방지)
  source_name   text        NOT NULL,   -- 출처명: 'CNBC', 'MarketWatch', 'Investing.com', '네이버'
  country       text        NOT NULL,   -- 국가: 'KR' | 'US'
  published_at  timestamptz NOT NULL,   -- 원본 발행 시간
  created_at    timestamptz DEFAULT now()
);

-- 인덱스: 최신순 조회용
CREATE INDEX idx_articles_published_at ON articles (published_at DESC);

-- 인덱스: 출처 필터용
CREATE INDEX idx_articles_source_name ON articles (source_name);

-- 인덱스: 한국/미국 필터용
CREATE INDEX idx_articles_country ON articles (country);

-- ============================================
-- RLS (Row Level Security) 설정
-- ============================================

-- RLS 활성화
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

-- 모든 유저 (비로그인 포함) SELECT 허용
CREATE POLICY "articles_select_policy"
  ON articles
  FOR SELECT
  USING (true);

-- INSERT/UPDATE/DELETE는 별도 정책 없음
-- service_role은 RLS를 bypass하므로 Cron Job에서 정상 동작

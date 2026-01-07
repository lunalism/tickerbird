-- ============================================================================
-- AlphaBoard - 관심종목 테이블 마이그레이션
-- ============================================================================
-- 파일: 002_create_watchlist.sql
-- 설명: 사용자별 관심종목 목록을 저장하는 테이블
-- 작성일: 2024-01-15
-- ============================================================================

-- ============================================================================
-- watchlist 테이블
-- ============================================================================
-- 용도: 사용자가 관심 있는 종목을 저장
-- 특징:
--   - 사용자별로 여러 종목 저장 가능 (1:N 관계)
--   - 한국(KR)과 미국(US) 시장 모두 지원
--   - 동일 사용자가 같은 종목을 중복 등록할 수 없음
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.watchlist (
    -- ========================================
    -- 기본 키: 자동 생성 UUID
    -- ========================================
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- ========================================
    -- 외래 키: 사용자 ID
    -- profiles 테이블과 연결
    -- 사용자 삭제 시 관심종목도 함께 삭제 (CASCADE)
    -- ========================================
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

    -- ========================================
    -- 종목 코드 (티커)
    -- 한국: 6자리 숫자 (예: '005930')
    -- 미국: 알파벳 (예: 'AAPL', 'TSLA')
    -- ========================================
    ticker TEXT NOT NULL,

    -- ========================================
    -- 시장 구분
    -- 'KR': 한국 (KOSPI, KOSDAQ)
    -- 'US': 미국 (NYSE, NASDAQ, AMEX)
    -- ========================================
    market TEXT NOT NULL CHECK (market IN ('KR', 'US')),

    -- ========================================
    -- 종목명
    -- 사용자에게 표시되는 종목 이름
    -- 예: '삼성전자', 'Apple Inc.'
    -- ========================================
    stock_name TEXT NOT NULL,

    -- ========================================
    -- 등록 시간
    -- 관심종목에 추가한 시간
    -- ========================================
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 유니크 제약 조건
-- ============================================================================
-- 동일 사용자가 같은 시장의 같은 종목을 중복 등록할 수 없음
-- 예: user1이 KR 시장의 005930을 두 번 등록 불가

ALTER TABLE public.watchlist
    DROP CONSTRAINT IF EXISTS watchlist_user_ticker_market_unique;

ALTER TABLE public.watchlist
    ADD CONSTRAINT watchlist_user_ticker_market_unique
    UNIQUE (user_id, ticker, market);

-- ============================================================================
-- 인덱스
-- ============================================================================

-- 사용자별 관심종목 조회 최적화
-- 자주 사용되는 쿼리: SELECT * FROM watchlist WHERE user_id = ?
CREATE INDEX IF NOT EXISTS watchlist_user_id_idx ON public.watchlist(user_id);

-- 사용자별 + 생성시간 정렬 조회 최적화
-- 관심종목을 최신 등록순으로 조회할 때 사용
CREATE INDEX IF NOT EXISTS watchlist_user_created_idx ON public.watchlist(user_id, created_at DESC);

-- 시장별 조회 최적화 (선택사항)
CREATE INDEX IF NOT EXISTS watchlist_market_idx ON public.watchlist(market);

-- ============================================================================
-- 테이블 설명 추가
-- ============================================================================
COMMENT ON TABLE public.watchlist IS '사용자별 관심종목 목록';
COMMENT ON COLUMN public.watchlist.id IS '관심종목 고유 ID';
COMMENT ON COLUMN public.watchlist.user_id IS '사용자 ID (profiles.id 참조)';
COMMENT ON COLUMN public.watchlist.ticker IS '종목 코드 (예: 005930, AAPL)';
COMMENT ON COLUMN public.watchlist.market IS '시장 구분 (KR: 한국, US: 미국)';
COMMENT ON COLUMN public.watchlist.stock_name IS '종목명 (예: 삼성전자, Apple Inc.)';
COMMENT ON COLUMN public.watchlist.created_at IS '관심종목 등록 시간';

-- ============================================================================
-- AlphaBoard - 최근 본 종목 테이블 마이그레이션
-- ============================================================================
-- 파일: 003_create_recently_viewed.sql
-- 설명: 사용자가 최근에 조회한 종목 기록을 저장하는 테이블
-- 작성일: 2024-01-15
-- ============================================================================

-- ============================================================================
-- recently_viewed 테이블
-- ============================================================================
-- 용도: 사용자가 종목 상세 페이지를 방문한 기록 저장
-- 특징:
--   - 사용자별로 최근 본 종목 기록 (최대 20개 권장, 앱 레벨에서 제한)
--   - 같은 종목 재방문 시 viewed_at만 갱신 (UPSERT)
--   - 한국(KR)과 미국(US) 시장 모두 지원
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.recently_viewed (
    -- ========================================
    -- 기본 키: 자동 생성 UUID
    -- ========================================
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- ========================================
    -- 외래 키: 사용자 ID
    -- profiles 테이블과 연결
    -- 사용자 삭제 시 기록도 함께 삭제 (CASCADE)
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
    -- 마지막 조회 시간
    -- 같은 종목 재방문 시 이 값만 갱신됨
    -- 최신순 정렬에 사용
    -- ========================================
    viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 유니크 제약 조건
-- ============================================================================
-- 동일 사용자가 같은 시장의 같은 종목은 하나의 레코드만 유지
-- 재방문 시 viewed_at만 UPDATE (UPSERT 패턴)

ALTER TABLE public.recently_viewed
    DROP CONSTRAINT IF EXISTS recently_viewed_user_ticker_market_unique;

ALTER TABLE public.recently_viewed
    ADD CONSTRAINT recently_viewed_user_ticker_market_unique
    UNIQUE (user_id, ticker, market);

-- ============================================================================
-- 인덱스
-- ============================================================================

-- 사용자별 최근 본 종목 조회 최적화
-- 자주 사용되는 쿼리: SELECT * FROM recently_viewed WHERE user_id = ? ORDER BY viewed_at DESC
CREATE INDEX IF NOT EXISTS recently_viewed_user_id_idx ON public.recently_viewed(user_id);

-- 사용자별 + 조회시간 정렬 조회 최적화 (가장 중요한 인덱스)
-- 최근 본 종목을 최신순으로 조회할 때 사용
CREATE INDEX IF NOT EXISTS recently_viewed_user_viewed_idx ON public.recently_viewed(user_id, viewed_at DESC);

-- ============================================================================
-- UPSERT용 함수 (선택사항)
-- ============================================================================
-- 종목 방문 시 호출: 새 레코드 삽입 또는 기존 레코드의 viewed_at 갱신
-- 애플리케이션에서 INSERT ... ON CONFLICT 사용 시 이 함수는 불필요

CREATE OR REPLACE FUNCTION public.upsert_recently_viewed(
    p_user_id UUID,
    p_ticker TEXT,
    p_market TEXT,
    p_stock_name TEXT
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.recently_viewed (user_id, ticker, market, stock_name, viewed_at)
    VALUES (p_user_id, p_ticker, p_market, p_stock_name, NOW())
    ON CONFLICT (user_id, ticker, market)
    DO UPDATE SET
        viewed_at = NOW(),
        stock_name = EXCLUDED.stock_name;  -- 종목명이 변경되었을 수 있으므로 갱신
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 오래된 기록 정리 함수 (선택사항)
-- ============================================================================
-- 사용자별로 최근 20개만 유지하고 나머지는 삭제
-- 주기적으로 실행하거나, INSERT 후 트리거로 실행 가능

CREATE OR REPLACE FUNCTION public.cleanup_old_recently_viewed(p_user_id UUID, p_max_count INTEGER DEFAULT 20)
RETURNS VOID AS $$
BEGIN
    DELETE FROM public.recently_viewed
    WHERE user_id = p_user_id
    AND id NOT IN (
        SELECT id
        FROM public.recently_viewed
        WHERE user_id = p_user_id
        ORDER BY viewed_at DESC
        LIMIT p_max_count
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 테이블 설명 추가
-- ============================================================================
COMMENT ON TABLE public.recently_viewed IS '사용자별 최근 본 종목 기록';
COMMENT ON COLUMN public.recently_viewed.id IS '기록 고유 ID';
COMMENT ON COLUMN public.recently_viewed.user_id IS '사용자 ID (profiles.id 참조)';
COMMENT ON COLUMN public.recently_viewed.ticker IS '종목 코드 (예: 005930, AAPL)';
COMMENT ON COLUMN public.recently_viewed.market IS '시장 구분 (KR: 한국, US: 미국)';
COMMENT ON COLUMN public.recently_viewed.stock_name IS '종목명 (예: 삼성전자, Apple Inc.)';
COMMENT ON COLUMN public.recently_viewed.viewed_at IS '마지막 조회 시간';

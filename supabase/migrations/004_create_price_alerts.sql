-- ============================================================================
-- AlphaBoard - 가격 알림 테이블 마이그레이션
-- ============================================================================
-- 파일: 004_create_price_alerts.sql
-- 설명: 사용자가 설정한 가격 알림 정보를 저장하는 테이블
-- 작성일: 2024-01-15
-- ============================================================================

-- ============================================================================
-- price_alerts 테이블
-- ============================================================================
-- 용도: 특정 종목이 목표 가격에 도달하면 알림을 받기 위한 설정 저장
-- 특징:
--   - 사용자별로 여러 알림 설정 가능
--   - 상승/하락 방향 설정 가능 (above/below)
--   - 알림 발생 후 비활성화 또는 삭제 가능
--   - 한국(KR)과 미국(US) 시장 모두 지원
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.price_alerts (
    -- ========================================
    -- 기본 키: 자동 생성 UUID
    -- ========================================
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- ========================================
    -- 외래 키: 사용자 ID
    -- profiles 테이블과 연결
    -- 사용자 삭제 시 알림 설정도 함께 삭제 (CASCADE)
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
    -- 목표 가격
    -- 이 가격에 도달하면 알림 발생
    -- NUMERIC 타입: 정확한 소수점 계산 (환율, 주가 등)
    -- ========================================
    target_price NUMERIC(15, 4) NOT NULL,

    -- ========================================
    -- 알림 방향
    -- 'above': 목표가 이상일 때 알림 (상승 알림)
    -- 'below': 목표가 이하일 때 알림 (하락 알림)
    -- ========================================
    direction TEXT NOT NULL CHECK (direction IN ('above', 'below')),

    -- ========================================
    -- 활성화 상태
    -- true: 알림 활성화 (모니터링 중)
    -- false: 알림 비활성화 (일시 중지)
    -- ========================================
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    -- ========================================
    -- 트리거 상태
    -- true: 알림이 이미 발생함 (목표가 도달)
    -- false: 아직 목표가에 도달하지 않음
    -- ========================================
    is_triggered BOOLEAN NOT NULL DEFAULT FALSE,

    -- ========================================
    -- 생성 시간
    -- 알림 설정을 만든 시간
    -- ========================================
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- ========================================
    -- 트리거 시간
    -- 알림이 발생한 시간 (is_triggered가 true일 때만 값 존재)
    -- ========================================
    triggered_at TIMESTAMPTZ
);

-- ============================================================================
-- 인덱스
-- ============================================================================

-- 사용자별 알림 조회 최적화
-- 자주 사용되는 쿼리: SELECT * FROM price_alerts WHERE user_id = ?
CREATE INDEX IF NOT EXISTS price_alerts_user_id_idx ON public.price_alerts(user_id);

-- 활성화된 알림만 조회 (알림 체크 배치 작업용)
-- 자주 사용되는 쿼리: SELECT * FROM price_alerts WHERE is_active = true AND is_triggered = false
CREATE INDEX IF NOT EXISTS price_alerts_active_idx ON public.price_alerts(is_active, is_triggered)
    WHERE is_active = TRUE AND is_triggered = FALSE;

-- 종목별 알림 조회 (특정 종목의 알림 확인용)
CREATE INDEX IF NOT EXISTS price_alerts_ticker_market_idx ON public.price_alerts(ticker, market);

-- 사용자별 + 생성시간 정렬 조회 최적화
CREATE INDEX IF NOT EXISTS price_alerts_user_created_idx ON public.price_alerts(user_id, created_at DESC);

-- ============================================================================
-- 알림 트리거 함수 (선택사항)
-- ============================================================================
-- 알림이 발생했을 때 호출: is_triggered를 true로 설정하고 triggered_at 기록

CREATE OR REPLACE FUNCTION public.trigger_price_alert(p_alert_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.price_alerts
    SET
        is_triggered = TRUE,
        triggered_at = NOW()
    WHERE id = p_alert_id
    AND is_active = TRUE
    AND is_triggered = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 알림 재활성화 함수 (선택사항)
-- ============================================================================
-- 트리거된 알림을 다시 활성화 (반복 알림용)

CREATE OR REPLACE FUNCTION public.reactivate_price_alert(p_alert_id UUID, p_new_target_price NUMERIC DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
    UPDATE public.price_alerts
    SET
        is_triggered = FALSE,
        triggered_at = NULL,
        is_active = TRUE,
        target_price = COALESCE(p_new_target_price, target_price)
    WHERE id = p_alert_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 테이블 설명 추가
-- ============================================================================
COMMENT ON TABLE public.price_alerts IS '사용자별 가격 알림 설정';
COMMENT ON COLUMN public.price_alerts.id IS '알림 고유 ID';
COMMENT ON COLUMN public.price_alerts.user_id IS '사용자 ID (profiles.id 참조)';
COMMENT ON COLUMN public.price_alerts.ticker IS '종목 코드 (예: 005930, AAPL)';
COMMENT ON COLUMN public.price_alerts.market IS '시장 구분 (KR: 한국, US: 미국)';
COMMENT ON COLUMN public.price_alerts.stock_name IS '종목명 (예: 삼성전자, Apple Inc.)';
COMMENT ON COLUMN public.price_alerts.target_price IS '목표 가격';
COMMENT ON COLUMN public.price_alerts.direction IS '알림 방향 (above: 이상, below: 이하)';
COMMENT ON COLUMN public.price_alerts.is_active IS '활성화 상태 (true: 활성, false: 비활성)';
COMMENT ON COLUMN public.price_alerts.is_triggered IS '트리거 상태 (true: 발생함, false: 미발생)';
COMMENT ON COLUMN public.price_alerts.created_at IS '알림 생성 시간';
COMMENT ON COLUMN public.price_alerts.triggered_at IS '알림 발생 시간';

-- ============================================================================
-- AlphaBoard - Row Level Security (RLS) 정책 마이그레이션
-- ============================================================================
-- 파일: 005_create_rls_policies.sql
-- 설명: 모든 테이블에 대한 행 수준 보안 정책 설정
-- 작성일: 2024-01-15
-- ============================================================================
--
-- RLS란?
-- - Row Level Security의 약자
-- - 데이터베이스 레벨에서 행(row) 단위로 접근을 제어
-- - 사용자가 자신의 데이터만 조회/수정/삭제할 수 있도록 보장
-- - SQL Injection이나 클라이언트 조작으로부터 데이터 보호
--
-- Supabase에서의 RLS:
-- - 기본적으로 모든 테이블은 RLS가 비활성화됨
-- - RLS를 활성화하면 명시적인 정책이 없는 한 모든 접근이 차단됨
-- - auth.uid()로 현재 로그인한 사용자의 ID를 얻을 수 있음
-- ============================================================================

-- ============================================================================
-- 1. profiles 테이블 RLS 정책
-- ============================================================================

-- RLS 활성화
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (재실행 가능하도록)
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;

-- SELECT: 본인 프로필만 조회 가능
CREATE POLICY "profiles_select_own" ON public.profiles
    FOR SELECT
    USING (auth.uid() = id);

-- INSERT: 본인 ID로만 삽입 가능 (트리거가 자동 생성하므로 보통 사용 안함)
CREATE POLICY "profiles_insert_own" ON public.profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- UPDATE: 본인 프로필만 수정 가능
CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- DELETE: 본인 프로필만 삭제 가능 (보통 계정 탈퇴 시 사용)
CREATE POLICY "profiles_delete_own" ON public.profiles
    FOR DELETE
    USING (auth.uid() = id);

-- ============================================================================
-- 2. watchlist 테이블 RLS 정책
-- ============================================================================

-- RLS 활성화
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제
DROP POLICY IF EXISTS "watchlist_select_own" ON public.watchlist;
DROP POLICY IF EXISTS "watchlist_insert_own" ON public.watchlist;
DROP POLICY IF EXISTS "watchlist_update_own" ON public.watchlist;
DROP POLICY IF EXISTS "watchlist_delete_own" ON public.watchlist;

-- SELECT: 본인 관심종목만 조회 가능
CREATE POLICY "watchlist_select_own" ON public.watchlist
    FOR SELECT
    USING (auth.uid() = user_id);

-- INSERT: 본인 user_id로만 삽입 가능
CREATE POLICY "watchlist_insert_own" ON public.watchlist
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- UPDATE: 본인 관심종목만 수정 가능
CREATE POLICY "watchlist_update_own" ON public.watchlist
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- DELETE: 본인 관심종목만 삭제 가능
CREATE POLICY "watchlist_delete_own" ON public.watchlist
    FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- 3. recently_viewed 테이블 RLS 정책
-- ============================================================================

-- RLS 활성화
ALTER TABLE public.recently_viewed ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제
DROP POLICY IF EXISTS "recently_viewed_select_own" ON public.recently_viewed;
DROP POLICY IF EXISTS "recently_viewed_insert_own" ON public.recently_viewed;
DROP POLICY IF EXISTS "recently_viewed_update_own" ON public.recently_viewed;
DROP POLICY IF EXISTS "recently_viewed_delete_own" ON public.recently_viewed;

-- SELECT: 본인의 최근 본 종목만 조회 가능
CREATE POLICY "recently_viewed_select_own" ON public.recently_viewed
    FOR SELECT
    USING (auth.uid() = user_id);

-- INSERT: 본인 user_id로만 삽입 가능
CREATE POLICY "recently_viewed_insert_own" ON public.recently_viewed
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- UPDATE: 본인의 최근 본 종목만 수정 가능 (viewed_at 갱신용)
CREATE POLICY "recently_viewed_update_own" ON public.recently_viewed
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- DELETE: 본인의 최근 본 종목만 삭제 가능
CREATE POLICY "recently_viewed_delete_own" ON public.recently_viewed
    FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- 4. price_alerts 테이블 RLS 정책
-- ============================================================================

-- RLS 활성화
ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제
DROP POLICY IF EXISTS "price_alerts_select_own" ON public.price_alerts;
DROP POLICY IF EXISTS "price_alerts_insert_own" ON public.price_alerts;
DROP POLICY IF EXISTS "price_alerts_update_own" ON public.price_alerts;
DROP POLICY IF EXISTS "price_alerts_delete_own" ON public.price_alerts;

-- SELECT: 본인의 가격 알림만 조회 가능
CREATE POLICY "price_alerts_select_own" ON public.price_alerts
    FOR SELECT
    USING (auth.uid() = user_id);

-- INSERT: 본인 user_id로만 삽입 가능
CREATE POLICY "price_alerts_insert_own" ON public.price_alerts
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- UPDATE: 본인의 가격 알림만 수정 가능
CREATE POLICY "price_alerts_update_own" ON public.price_alerts
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- DELETE: 본인의 가격 알림만 삭제 가능
CREATE POLICY "price_alerts_delete_own" ON public.price_alerts
    FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- 서비스 역할 접근 허용 (선택사항)
-- ============================================================================
-- Supabase의 service_role 키를 사용하는 서버 측 코드는
-- RLS를 우회하여 모든 데이터에 접근 가능
-- 이는 배치 작업, 관리자 기능 등에 필요

-- 예: 가격 알림 배치 작업에서 모든 활성 알림 조회
-- service_role 키를 사용하면 별도 정책 없이 접근 가능

-- ============================================================================
-- 확인용 쿼리 (테스트용)
-- ============================================================================
-- 아래 쿼리로 현재 설정된 정책 확인 가능:
-- SELECT * FROM pg_policies WHERE schemaname = 'public';

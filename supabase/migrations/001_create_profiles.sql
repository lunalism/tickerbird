-- ============================================================================
-- AlphaBoard - 사용자 프로필 테이블 마이그레이션
-- ============================================================================
-- 파일: 001_create_profiles.sql
-- 설명: 사용자 프로필 정보를 저장하는 테이블
-- 작성일: 2024-01-15
-- ============================================================================

-- ============================================================================
-- profiles 테이블
-- ============================================================================
-- 용도: Supabase Auth의 auth.users 테이블과 연동되는 사용자 프로필 정보 저장
-- 특징:
--   - auth.users.id를 PK로 사용 (1:1 관계)
--   - Google OAuth 로그인 시 자동으로 생성됨
--   - 추가 프로필 정보 (이름, 아바타 등) 저장
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
    -- ========================================
    -- 기본 키: auth.users.id와 동일한 UUID 사용
    -- ========================================
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

    -- ========================================
    -- 이메일 주소
    -- Google OAuth 로그인 시 자동으로 설정됨
    -- ========================================
    email TEXT NOT NULL,

    -- ========================================
    -- 사용자 이름 (닉네임)
    -- Google 계정의 이름이 기본값으로 설정됨
    -- 사용자가 나중에 변경 가능
    -- ========================================
    name TEXT,

    -- ========================================
    -- 프로필 이미지 URL
    -- Google 계정의 프로필 사진이 기본값으로 설정됨
    -- ========================================
    avatar_url TEXT,

    -- ========================================
    -- 타임스탬프
    -- created_at: 계정 생성 시간
    -- updated_at: 마지막 프로필 수정 시간
    -- ========================================
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 인덱스
-- ============================================================================

-- 이메일로 사용자 검색 시 사용 (중복 방지 및 빠른 검색)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles(email);

-- ============================================================================
-- updated_at 자동 갱신 트리거
-- ============================================================================
-- 프로필 정보 수정 시 updated_at 컬럼을 자동으로 현재 시간으로 갱신

-- 트리거 함수 생성
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- profiles 테이블에 트리거 적용
DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 신규 사용자 생성 시 자동으로 profiles에 추가하는 트리거
-- ============================================================================
-- auth.users에 새 사용자가 생성되면 자동으로 profiles 테이블에 레코드 생성
-- Google OAuth 로그인 시 user_metadata에서 이름과 아바타 정보 추출

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        -- Google OAuth의 경우 raw_user_meta_data에서 이름 추출
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
        -- Google OAuth의 경우 raw_user_meta_data에서 아바타 URL 추출
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- auth.users 테이블에 트리거 적용 (새 사용자 생성 시)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 테이블 설명 추가
-- ============================================================================
COMMENT ON TABLE public.profiles IS '사용자 프로필 정보 테이블 - auth.users와 1:1 연동';
COMMENT ON COLUMN public.profiles.id IS 'auth.users.id와 동일한 사용자 고유 ID';
COMMENT ON COLUMN public.profiles.email IS '사용자 이메일 주소';
COMMENT ON COLUMN public.profiles.name IS '사용자 표시 이름 (닉네임)';
COMMENT ON COLUMN public.profiles.avatar_url IS '프로필 이미지 URL';
COMMENT ON COLUMN public.profiles.created_at IS '계정 생성 시간';
COMMENT ON COLUMN public.profiles.updated_at IS '마지막 프로필 수정 시간';

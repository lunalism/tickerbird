-- =====================================================
-- admin_settings 및 profiles 테이블 RLS 정책 문서화
-- 대시보드에서 생성된 정책을 마이그레이션으로 기록
-- 새 환경에서 안전하게 실행되도록 DROP IF EXISTS 포함
-- 생성일: 2026-04-08
-- =====================================================

-- ─── admin_settings 테이블 ───

-- RLS 활성화 (이미 활성화되어 있어도 에러 없음)
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- admin_settings: 어드민만 전체 조작 가능
DROP POLICY IF EXISTS "어드민 설정 관리 - 어드민만" ON admin_settings;
CREATE POLICY "어드민 설정 관리 - 어드민만"
  ON admin_settings
  FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- admin_settings: 전체 읽기 허용 (차단 언론사 목록 등 클라이언트에서 읽어야 함)
DROP POLICY IF EXISTS "어드민 설정 읽기 - 전체 허용" ON admin_settings;
CREATE POLICY "어드민 설정 읽기 - 전체 허용"
  ON admin_settings
  FOR SELECT
  TO public
  USING (true);

-- ─── profiles 테이블 ───

-- RLS 활성화
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- profiles: 본인만 생성 가능
DROP POLICY IF EXISTS "프로필 생성 - 본인만" ON profiles;
CREATE POLICY "프로필 생성 - 본인만"
  ON profiles
  FOR INSERT
  TO public
  WITH CHECK (auth.uid() = id);

-- profiles: 본인만 수정 가능 (타인이 is_admin, tier 등 수정 불가)
DROP POLICY IF EXISTS "프로필 수정 - 본인만" ON profiles;
CREATE POLICY "프로필 수정 - 본인만"
  ON profiles
  FOR UPDATE
  TO public
  USING (auth.uid() = id);

-- profiles: 전체 읽기 허용 (닉네임, 아바타 등 공개 정보)
DROP POLICY IF EXISTS "프로필 읽기 - 전체 허용" ON profiles;
CREATE POLICY "프로필 읽기 - 전체 허용"
  ON profiles
  FOR SELECT
  TO public
  USING (true);

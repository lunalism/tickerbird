-- ============================================
-- 차단 언론사 목록 초기값 삽입
-- admin_settings 테이블의 key-value 패턴 사용
-- ============================================

INSERT INTO admin_settings (key, value)
VALUES ('blocked_news_sources', '["천지일보"]')
ON CONFLICT (key) DO UPDATE
SET value = '["천지일보"]';

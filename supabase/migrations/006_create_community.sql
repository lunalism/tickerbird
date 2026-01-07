-- =====================================================
-- 커뮤니티 테이블 생성 마이그레이션
-- =====================================================
-- 게시글, 댓글, 좋아요, 팔로우 테이블 생성
-- RLS 정책: 읽기는 모든 사용자, 쓰기/수정/삭제는 본인만
-- =====================================================

-- =====================================================
-- 1. posts (게시글) 테이블
-- =====================================================
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'stock' CHECK (category IN ('stock', 'strategy', 'qna')),
  tickers TEXT[] DEFAULT '{}',
  hashtags TEXT[] DEFAULT '{}',
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  reposts_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_category ON public.posts(category);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_tickers ON public.posts USING GIN(tickers);
CREATE INDEX IF NOT EXISTS idx_posts_hashtags ON public.posts USING GIN(hashtags);

-- RLS 활성화
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 모든 사용자 읽기 가능
CREATE POLICY "posts_select_policy" ON public.posts
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- RLS 정책: 인증된 사용자만 생성 가능
CREATE POLICY "posts_insert_policy" ON public.posts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS 정책: 본인 게시글만 수정 가능
CREATE POLICY "posts_update_policy" ON public.posts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS 정책: 본인 게시글만 삭제 가능
CREATE POLICY "posts_delete_policy" ON public.posts
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION update_posts_updated_at();

-- =====================================================
-- 2. comments (댓글) 테이블
-- =====================================================
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON public.comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON public.comments(created_at DESC);

-- RLS 활성화
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 모든 사용자 읽기 가능
CREATE POLICY "comments_select_policy" ON public.comments
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- RLS 정책: 인증된 사용자만 생성 가능
CREATE POLICY "comments_insert_policy" ON public.comments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS 정책: 본인 댓글만 수정 가능
CREATE POLICY "comments_update_policy" ON public.comments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS 정책: 본인 댓글만 삭제 가능
CREATE POLICY "comments_delete_policy" ON public.comments
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 댓글 추가 시 게시글 comments_count 증가 함수
CREATE OR REPLACE FUNCTION increment_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.posts
  SET comments_count = comments_count + 1
  WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 댓글 삭제 시 게시글 comments_count 감소 함수
CREATE OR REPLACE FUNCTION decrement_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.posts
  SET comments_count = comments_count - 1
  WHERE id = OLD.post_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_increment_comments_count
  AFTER INSERT ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION increment_comments_count();

CREATE TRIGGER trigger_decrement_comments_count
  AFTER DELETE ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION decrement_comments_count();

-- =====================================================
-- 3. likes (좋아요) 테이블
-- =====================================================
CREATE TABLE IF NOT EXISTS public.likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- 한 사용자가 같은 게시글에 중복 좋아요 방지
  UNIQUE(post_id, user_id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_likes_post_id ON public.likes(post_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON public.likes(user_id);

-- RLS 활성화
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 모든 사용자 읽기 가능
CREATE POLICY "likes_select_policy" ON public.likes
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- RLS 정책: 인증된 사용자만 생성 가능
CREATE POLICY "likes_insert_policy" ON public.likes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS 정책: 본인 좋아요만 삭제 가능
CREATE POLICY "likes_delete_policy" ON public.likes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 좋아요 추가 시 게시글 likes_count 증가 함수
CREATE OR REPLACE FUNCTION increment_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.posts
  SET likes_count = likes_count + 1
  WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 좋아요 삭제 시 게시글 likes_count 감소 함수
CREATE OR REPLACE FUNCTION decrement_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.posts
  SET likes_count = likes_count - 1
  WHERE id = OLD.post_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_increment_likes_count
  AFTER INSERT ON public.likes
  FOR EACH ROW
  EXECUTE FUNCTION increment_likes_count();

CREATE TRIGGER trigger_decrement_likes_count
  AFTER DELETE ON public.likes
  FOR EACH ROW
  EXECUTE FUNCTION decrement_likes_count();

-- =====================================================
-- 4. follows (팔로우) 테이블
-- =====================================================
CREATE TABLE IF NOT EXISTS public.follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- 자기 자신 팔로우 방지 및 중복 팔로우 방지
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON public.follows(following_id);

-- RLS 활성화
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 모든 사용자 읽기 가능
CREATE POLICY "follows_select_policy" ON public.follows
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- RLS 정책: 인증된 사용자만 생성 가능 (본인이 팔로워인 경우만)
CREATE POLICY "follows_insert_policy" ON public.follows
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = follower_id);

-- RLS 정책: 본인이 팔로워인 경우만 삭제 가능
CREATE POLICY "follows_delete_policy" ON public.follows
  FOR DELETE
  TO authenticated
  USING (auth.uid() = follower_id);

-- =====================================================
-- 5. profiles 테이블에 팔로워/팔로잉 카운트 컬럼 추가 (선택사항)
-- =====================================================
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS followers_count INTEGER DEFAULT 0;
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0;

-- =====================================================
-- 마이그레이션 완료 확인용 코멘트
-- =====================================================
COMMENT ON TABLE public.posts IS '커뮤니티 게시글 테이블';
COMMENT ON TABLE public.comments IS '게시글 댓글 테이블';
COMMENT ON TABLE public.likes IS '게시글 좋아요 테이블';
COMMENT ON TABLE public.follows IS '사용자 팔로우 테이블';

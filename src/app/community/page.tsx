'use client';

/**
 * 커뮤니티 페이지
 *
 * 타임라인 피드 스타일의 투자 커뮤니티입니다.
 *
 * 레이아웃:
 * - 왼쪽: 피드 (메인)
 * - 오른쪽 사이드바: 인기글, 토론 종목, 활발한 유저
 * - 모바일: 피드만 표시, 사이드바 숨김
 *
 * 기능:
 * - 카테고리 탭: 전체 / 팔로잉 / 종목토론 / 투자전략 / Q&A
 * - 정렬: 최신순 / 인기순
 * - 글쓰기: 데스크톱은 상단 입력창, 모바일은 FAB
 * - 종목 태그: $AAPL 형태로 입력하면 파란색 링크
 *
 * Next.js 15+ 호환:
 * - useSearchParams()는 Suspense boundary 안에서 사용해야 함
 * - CommunityContent 컴포넌트로 분리하여 Suspense로 감싸서 사용
 */

import { useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  CommunityCategory,
  SortType,
  CommunityPost,
  CommunityComment,
  FeedPost as FeedPostType,
  CommunityApiResponse,
} from '@/types/community';
import { Sidebar, BottomNav } from '@/components/layout';
import {
  CommunityTabs,
  CommunitySidebar,
  WriteButton,
  FeedPost,
  PostComposer,
  PostDetailModal,
} from '@/components/features/community';
import { hotPosts, discussionStocks, activeUsers } from '@/constants';
import { useAuth } from '@/components/providers/AuthProvider';
import { useCommunity } from '@/hooks';
import { showWarning } from '@/lib/toast';
import { getAvatarPath, isValidAvatarId } from '@/constants/avatars';

/**
 * CommunityPost를 FeedPost 형식으로 변환
 * 기존 FeedPost 컴포넌트와 호환성 유지
 *
 * 작성자 정보 표시:
 * - author: 닉네임 (표시용)
 * - username: @handle (고유 식별자, 이메일 앞부분)
 * - userId: 작성자 ID (수정/삭제 권한 확인용)
 * - createdAtRaw: ISO 형식 원본 시간 (수정 가능 시간 계산용)
 */
function toFeedPost(post: CommunityPost): FeedPostType {
  // 상대 시간 계산
  const createdDate = new Date(post.createdAt);
  const now = new Date();
  const diffMs = now.getTime() - createdDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  let timeAgo: string;
  if (diffMins < 1) {
    timeAgo = '방금 전';
  } else if (diffMins < 60) {
    timeAgo = `${diffMins}분 전`;
  } else if (diffHours < 24) {
    timeAgo = `${diffHours}시간 전`;
  } else if (diffDays < 7) {
    timeAgo = `${diffDays}일 전`;
  } else {
    timeAgo = createdDate.toLocaleDateString('ko-KR');
  }

  // 아바타 처리
  const authorName = post.author.name || '사용자';

  // avatarUrl이 이미지 URL인지 확인
  // 1. http:// 또는 https:// 로 시작하는 외부 URL
  // 2. /avatars/ 로 시작하는 내부 경로 (온보딩 아바타)
  const isImageUrl = post.author.avatarUrl?.startsWith('http') || post.author.avatarUrl?.startsWith('/avatars/');
  // 이미지 URL이면 그대로 사용, 아니면 null (FeedPost에서 이니셜로 처리)
  const authorAvatar = isImageUrl ? post.author.avatarUrl : null;

  // @handle: 고유 식별자 (이메일 앞부분 또는 userId 앞 8자리)
  const authorHandle = post.author.handle || post.userId.slice(0, 8);

  return {
    id: parseInt(post.id.replace(/-/g, '').slice(0, 8), 16) || Date.now(),
    author: authorName,
    username: authorHandle,  // @handle 사용 (닉네임 대신 고유 식별자)
    authorAvatar: authorAvatar || '',  // null이면 빈 문자열 (FeedPost에서 이니셜 표시)
    userId: post.userId,  // 작성자 ID (수정/삭제 권한 확인용)
    content: post.content,
    hashtags: post.hashtags,
    stockTags: post.tickers.map(ticker => ({
      ticker,
      name: ticker,
      price: 0,
      changePercent: 0,
    })),
    category: post.category,
    createdAt: timeAgo,
    createdAtRaw: post.createdAt,  // ISO 형식 원본 시간 (수정 가능 시간 계산용)
    likes: post.likesCount,
    comments: post.commentsCount,
    reposts: post.repostsCount,
    liked: post.isLiked,
    bookmarked: false,
    reposted: false,
    isHot: post.likesCount >= 10,
  };
}

/**
 * 커뮤니티 콘텐츠 컴포넌트
 *
 * useSearchParams()를 사용하므로 Suspense boundary 안에서 렌더링되어야 함
 * Next.js 15+에서는 useSearchParams가 정적 렌더링을 방해하므로
 * Suspense로 감싸서 클라이언트 사이드 렌더링으로 처리
 */
function CommunityContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeMenu, setActiveMenu] = useState('community');
  const [activeTab, setActiveTab] = useState<CommunityCategory>('all');
  const [sortType, setSortType] = useState<SortType>('latest');
  // AuthProvider의 useAuth 훅 사용 (Firebase Auth 연동)
  // useAuthStore(Zustand)가 아닌 useAuth(Context)를 사용해야 Firebase 로그인 상태를 인식함
  const { isLoggedIn, signInWithGoogle, user, userProfile } = useAuth();

  // 상세 모달 상태
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  /**
   * API 요청 시 사용할 인증 헤더 생성
   * (useCommunity의 getAuthHeaders와 동일한 로직)
   *
   * 댓글 작성 시 사용자 정보를 서버에 전달하기 위해 필요
   *
   * 사용자 이름(닉네임) 우선순위:
   * 1. userProfile.nickname (AlphaBoard 닉네임)
   * 2. userProfile.displayName (Google displayName, Firestore 저장됨)
   * 3. user.displayName (Firebase Auth)
   * 4. userProfile.email 앞부분
   * 5. user.email 앞부분
   * 6. '사용자' (기본값)
   *
   * 사용자 핸들(@아이디) 우선순위:
   * 1. userProfile.email 앞부분
   * 2. user.email 앞부분
   * 3. user.uid 앞 8자리
   */
  const getAuthHeaders = useCallback((): HeadersInit => {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (user?.uid) {
      headers['x-user-id'] = user.uid;

      // 사용자 이름(닉네임) 설정 - 표시용
      // nickname이 빈 문자열('')인 경우도 falsy로 처리됨
      const userName =
        (userProfile?.nickname && userProfile.nickname.trim()) ||
        (userProfile?.displayName && userProfile.displayName.trim()) ||
        user.displayName ||
        userProfile?.email?.split('@')[0] ||
        user.email?.split('@')[0] ||
        '사용자';
      headers['x-user-name'] = encodeURIComponent(userName);

      // 사용자 핸들(@아이디) 설정 - 고유 식별자
      // userProfile.email이 더 정확하므로 우선 사용
      const userHandle =
        userProfile?.email?.split('@')[0] ||
        user.email?.split('@')[0] ||
        user.uid.slice(0, 8);
      headers['x-user-handle'] = encodeURIComponent(userHandle);

      // 프로필 이미지 설정
      // 우선순위:
      // 1. userProfile.avatarId (온보딩에서 선택한 동물 아바타) → 경로로 변환
      // 2. userProfile.avatarUrl (Google 프로필 사진 - fallback)
      // 3. user.photoURL (Firebase Auth - 최후 fallback)
      let photoUrl: string | null = null;
      if (userProfile?.avatarId && isValidAvatarId(userProfile.avatarId)) {
        // 온보딩 아바타 ID를 경로로 변환 (예: 'shark' → '/avatars/avatar-shark.png')
        photoUrl = getAvatarPath(userProfile.avatarId);
      } else if (userProfile?.avatarUrl) {
        photoUrl = userProfile.avatarUrl;
      } else if (user.photoURL) {
        photoUrl = user.photoURL;
      }
      if (photoUrl) {
        headers['x-user-photo'] = encodeURIComponent(photoUrl);
      }
    }

    return headers;
  }, [user, userProfile]);

  /**
   * 로그인 필요 시 호출되는 콜백
   * - 토스트로 로그인 유도 메시지 표시
   */
  const handleLoginRequired = useCallback(() => {
    showWarning('로그인이 필요합니다', '좋아요와 댓글 작성은 로그인 후 이용 가능합니다');
  }, []);

  // URL 쿼리 파라미터에서 종목 필터 가져오기
  // /community?ticker=AAPL 형태로 접근 시 해당 종목 글만 표시
  const tickerFilter = searchParams.get('ticker') || undefined;

  // 종목 필터 해제 핸들러
  const clearTickerFilter = () => {
    router.push('/community');
  };

  // Supabase 연동 커뮤니티 훅
  const {
    posts,
    isLoading,
    error,
    hasMore,
    loadMore,
    refetch,
    createPost,
    toggleLike,
  } = useCommunity({
    category: activeTab,
    sort: sortType,
    ticker: tickerFilter,
  });

  /**
   * 좋아요 토글 핸들러
   */
  const handleLikeToggle = useCallback(async (postId: string): Promise<boolean> => {
    return await toggleLike(postId);
  }, [toggleLike]);

  /**
   * 댓글 목록 로드 핸들러
   */
  const handleLoadComments = useCallback(async (postId: string): Promise<CommunityComment[]> => {
    try {
      const response = await fetch(`/api/community/posts/${postId}/comments`);
      const result: CommunityApiResponse<{ comments: CommunityComment[] }> = await response.json();
      if (result.success && result.data) {
        return result.data.comments;
      }
      return [];
    } catch {
      return [];
    }
  }, []);

  /**
   * 댓글 작성 핸들러
   * - 인증 헤더 포함하여 API 호출 (사용자 정보 전달)
   */
  const handleAddComment = useCallback(async (postId: string, content: string): Promise<CommunityComment | null> => {
    try {
      const response = await fetch(`/api/community/posts/${postId}/comments`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ content }),
      });
      const result: CommunityApiResponse<CommunityComment> = await response.json();
      if (result.success && result.data) {
        return result.data;
      }
      return null;
    } catch {
      return null;
    }
  }, [getAuthHeaders]);

  /**
   * 게시글 수정 핸들러
   * - 수정 후 목록 새로고침
   */
  const handleEditPost = useCallback(async (postId: string, content: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/community/posts/${postId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ content }),
      });
      const result: CommunityApiResponse<CommunityPost> = await response.json();
      if (result.success) {
        // 목록 새로고침
        refetch();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [getAuthHeaders, refetch]);

  /**
   * 게시글 삭제 핸들러
   * - 삭제 후 목록 새로고침
   */
  const handleDeletePost = useCallback(async (postId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/community/posts/${postId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const result: CommunityApiResponse<{ deleted: boolean }> = await response.json();
      if (result.success) {
        // 목록 새로고침
        refetch();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [getAuthHeaders, refetch]);

  /**
   * 댓글 수정 핸들러
   */
  const handleEditComment = useCallback(async (
    postId: string,
    commentId: string,
    content: string
  ): Promise<CommunityComment | null> => {
    try {
      const response = await fetch(`/api/community/posts/${postId}/comments/${commentId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ content }),
      });
      const result: CommunityApiResponse<CommunityComment> = await response.json();
      if (result.success && result.data) {
        return result.data;
      }
      return null;
    } catch {
      return null;
    }
  }, [getAuthHeaders]);

  /**
   * 댓글 삭제 핸들러
   */
  const handleDeleteComment = useCallback(async (postId: string, commentId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/community/posts/${postId}/comments/${commentId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const result: CommunityApiResponse<{ deleted: boolean }> = await response.json();
      return result.success;
    } catch {
      return false;
    }
  }, [getAuthHeaders]);

  /**
   * 게시글 클릭 핸들러 (상세 모달 열기)
   */
  const handlePostClick = useCallback((postId: string) => {
    setSelectedPostId(postId);
    setIsModalOpen(true);
  }, []);

  /**
   * 모달 닫기 핸들러
   */
  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedPostId(null);
  }, []);

  // 선택된 게시글 찾기
  const selectedPost = selectedPostId ? posts.find(p => p.id === selectedPostId) : null;

  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-gray-900">
      {/* Sidebar - 모바일에서 숨김 */}
      <Sidebar activeMenu={activeMenu} onMenuChange={setActiveMenu} />

      {/* Bottom Navigation - 모바일에서만 표시 */}
      <BottomNav activeMenu={activeMenu} onMenuChange={setActiveMenu} />

      {/* 메인 콘텐츠 */}
      <main className="md:pl-[72px] lg:pl-60 transition-all duration-300">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-6">
          {/* 페이지 헤더 */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">커뮤니티</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              투자자들과 생각을 나누고 토론하세요
            </p>
          </div>

          {/* 종목 필터 배지 (ticker 쿼리 파라미터가 있을 때 표시) */}
          {tickerFilter && (
            <div className="mb-4 flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/50">
              <span className="text-blue-700 dark:text-blue-300 text-sm">
                <span className="font-medium">#{tickerFilter}</span> 관련 게시글만 표시 중
              </span>
              <button
                onClick={clearTickerFilter}
                className="ml-auto px-3 py-1 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-800/30 rounded-lg transition-colors"
              >
                필터 해제
              </button>
            </div>
          )}

          {/* 콘텐츠 그리드: 피드 + 사이드바 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* ========================================
                왼쪽: 피드 영역 (메인)
                ======================================== */}
            <div className="lg:col-span-2 space-y-4">
              {/* 카테고리 탭 + 정렬 */}
              <CommunityTabs
                activeTab={activeTab}
                onTabChange={setActiveTab}
                sortType={sortType}
                onSortChange={setSortType}
              />

              {/* 글쓰기 입력창 (데스크톱에서만 표시) */}
              <div className="hidden md:block">
                <PostComposer
                  isLoggedIn={isLoggedIn}
                  onLoginRequest={signInWithGoogle}
                  onSubmit={async (content: string) => {
                    // 해시태그 추출
                    const hashtagMatches = content.match(/#([^\s#]+)/g);
                    const hashtags = hashtagMatches
                      ? hashtagMatches.map(tag => tag.slice(1))
                      : [];

                    // 티커 추출
                    const tickerMatches = content.match(/\$([A-Za-z0-9]+)/g);
                    const tickers = tickerMatches
                      ? tickerMatches.map(tag => tag.slice(1).toUpperCase())
                      : [];

                    await createPost({
                      content,
                      category: activeTab === 'all' || activeTab === 'following' ? 'stock' : activeTab,
                      hashtags,
                      tickers,
                    });
                  }}
                />
              </div>

              {/* 에러 메시지 */}
              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-center">
                  {error}
                  <button
                    onClick={refetch}
                    className="ml-2 underline hover:no-underline"
                  >
                    다시 시도
                  </button>
                </div>
              )}

              {/* 피드 리스트 */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                {isLoading && posts.length === 0 ? (
                  /* 로딩 상태 */
                  <div className="p-8 text-center">
                    <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">
                      게시글을 불러오는 중...
                    </p>
                  </div>
                ) : posts.length > 0 ? (
                  posts.map((post) => (
                    <FeedPost
                      key={post.id}
                      post={toFeedPost(post)}
                      postId={post.id}
                      currentUserId={user?.uid}  // 현재 로그인한 사용자 ID (수정/삭제 권한 확인용)
                      onLikeToggle={handleLikeToggle}
                      onLoadComments={handleLoadComments}
                      onAddComment={handleAddComment}
                      onEditPost={handleEditPost}  // 게시글 수정 핸들러
                      onDeletePost={handleDeletePost}  // 게시글 삭제 핸들러
                      onEditComment={handleEditComment}  // 댓글 수정 핸들러
                      onDeleteComment={handleDeleteComment}  // 댓글 삭제 핸들러
                      fetchPrices={true}  // 커뮤니티 페이지에서는 실시간 가격 API 호출
                      isLoggedIn={isLoggedIn}  // 로그인 상태 전달 (좋아요/댓글 기능 활성화용)
                      onLoginRequired={handleLoginRequired}  // 비로그인 시 토스트 표시
                      onClick={() => handlePostClick(post.id)}  // 클릭 시 상세 모달 열기
                    />
                  ))
                ) : (
                  /* 빈 상태 */
                  <div className="p-8 text-center">
                    <div className="text-4xl mb-3">📭</div>
                    <p className="text-gray-500 dark:text-gray-400">
                      {activeTab === 'following'
                        ? '팔로우한 사용자의 글이 없습니다'
                        : '아직 게시물이 없습니다. 첫 번째 글을 작성해보세요!'}
                    </p>
                  </div>
                )}
              </div>

              {/* 더 보기 버튼 */}
              {hasMore && (
                <div className="text-center">
                  <button
                    onClick={loadMore}
                    disabled={isLoading}
                    className="px-6 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                  >
                    {isLoading ? '로딩 중...' : '더 보기'}
                  </button>
                </div>
              )}
            </div>

            {/* ========================================
                오른쪽: 사이드바 (데스크톱에서만 표시)
                ======================================== */}
            <div className="hidden lg:block">
              <CommunitySidebar
                hotPosts={hotPosts}
                discussionStocks={discussionStocks}
                activeUsers={activeUsers}
              />
            </div>
          </div>
        </div>
      </main>

      {/* 글쓰기 FAB (모바일에서만 표시) */}
      <WriteButton />

      {/* 게시글 상세 모달 */}
      {selectedPost && (
        <PostDetailModal
          post={toFeedPost(selectedPost)}
          postId={selectedPost.id}
          currentUserId={user?.uid}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onLikeToggle={handleLikeToggle}
          onLoadComments={handleLoadComments}
          onAddComment={handleAddComment}
          onEditPost={handleEditPost}
          onDeletePost={handleDeletePost}
          onEditComment={handleEditComment}
          onDeleteComment={handleDeleteComment}
          isLoggedIn={isLoggedIn}
          onLoginRequired={handleLoginRequired}
        />
      )}
    </div>
  );
}

/**
 * 커뮤니티 페이지 로딩 폴백 컴포넌트
 *
 * useSearchParams() 로딩 중에 표시되는 스켈레톤 UI
 */
function CommunityLoadingFallback() {
  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-gray-500 dark:text-gray-400">커뮤니티를 불러오는 중...</p>
      </div>
    </div>
  );
}

/**
 * 커뮤니티 페이지 (export default)
 *
 * Next.js 15+에서 useSearchParams()를 사용하는 컴포넌트는
 * Suspense boundary로 감싸야 정적 빌드 시 오류가 발생하지 않음
 *
 * Suspense는 useSearchParams()의 비동기 처리를 기다리면서
 * fallback UI를 표시하고, 준비되면 실제 콘텐츠를 렌더링
 */
export default function CommunityPage() {
  return (
    <Suspense fallback={<CommunityLoadingFallback />}>
      <CommunityContent />
    </Suspense>
  );
}

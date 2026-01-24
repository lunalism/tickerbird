'use client';

/**
 * 종목 상세 페이지 내 커뮤니티 섹션 컴포넌트
 *
 * 특정 종목에 태그된 커뮤니티 게시글을 표시합니다.
 *
 * 기능:
 * - 해당 종목 태그가 있는 글만 필터링해서 표시
 * - 글쓰기 시 자동으로 현재 종목 태그 추가
 * - 최대 5~10개 표시
 * - "더보기" 버튼 → /community?ticker=AAPL 로 이동
 *
 * 반응형 디자인:
 * - 모바일/태블릿/데스크톱 대응
 * - 다크모드 지원
 */

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTickerCommunity } from '@/hooks';
import { useAuth } from '@/components/providers/AuthProvider';
import { FeedPost } from './FeedPost';
import { PostDetailModal } from './PostDetailModal';
import { showWarning } from '@/lib/toast';
import { getAvatarPath, isValidAvatarId } from '@/constants/avatars';
import {
  CommunityPost,
  CommunityComment,
  FeedPost as FeedPostType,
  CommunityApiResponse,
} from '@/types/community';

// =====================================================
// Props 타입 정의
// =====================================================

interface TickerCommunitySectionProps {
  /** 종목 코드 (ticker) */
  ticker: string;
  /** 시장 코드 ('KR' | 'US') */
  market: 'KR' | 'US';
  /** 종목명 */
  stockName: string;
  /** 최대 표시 게시글 수 (기본: 5) */
  limit?: number;
}

// =====================================================
// 유틸리티 함수
// =====================================================

/**
 * CommunityPost를 FeedPost 형식으로 변환
 *
 * FeedPost 컴포넌트와 호환성 유지를 위해 데이터 변환
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

  // @handle: 고유 식별자
  const authorHandle = post.author.handle || post.userId.slice(0, 8);

  return {
    id: parseInt(post.id.replace(/-/g, '').slice(0, 8), 16) || Date.now(),
    author: authorName,
    username: authorHandle,
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

// =====================================================
// 컴포넌트
// =====================================================

export function TickerCommunitySection({
  ticker,
  market,
  stockName,
  limit = 5,
}: TickerCommunitySectionProps) {
  const router = useRouter();
  // useAuth에서 로그인 상태, 사용자 정보 가져오기
  const { isLoggedIn, signInWithGoogle, user, userProfile } = useAuth();

  // 종목별 커뮤니티 훅
  const {
    posts,
    isLoading,
    error,
    hasMore,
    refetch,
    createPost,
    toggleLike,
  } = useTickerCommunity({
    ticker,
    market,
    stockName,
    limit,
  });

  // 글쓰기 입력 상태
  const [composeContent, setComposeContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  /**
   * 게시글 작성 핸들러
   *
   * 현재 종목을 자동으로 태깅하여 게시글 작성
   */
  const handleSubmit = async () => {
    if (!composeContent.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const result = await createPost(composeContent.trim());
      if (result) {
        setComposeContent('');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

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
   * 더보기 버튼 클릭 핸들러
   *
   * /community?ticker=AAPL 페이지로 이동
   */
  const handleSeeMore = () => {
    router.push(`/community?ticker=${ticker}`);
  };

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
    <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
      {/* 섹션 헤더 */}
      <div className="px-4 py-4 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">💬</span>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              종목 토론
            </h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              #{ticker}
            </span>
          </div>
          {/* 더보기 링크 */}
          {posts.length > 0 && (
            <button
              onClick={handleSeeMore}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              더보기
            </button>
          )}
        </div>
      </div>

      {/* 글쓰기 입력창 */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
        {isLoggedIn ? (
          <div className="flex gap-3">
            {/* 프로필 아이콘 */}
            <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-sm flex-shrink-0">
              👤
            </div>
            {/* 입력창 + 게시 버튼 */}
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                value={composeContent}
                onChange={(e) => setComposeContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                placeholder={`${stockName}에 대한 의견을 공유하세요...`}
                className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-full text-sm
                           text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSubmit}
                disabled={!composeContent.trim() || isSubmitting}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-full
                           hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? '...' : '게시'}
              </button>
            </div>
          </div>
        ) : (
          /* 비로그인 상태 안내 */
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              로그인하고 토론에 참여하세요
            </p>
            <button
              onClick={signInWithGoogle}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-full hover:bg-blue-700 transition-colors"
            >
              로그인
            </button>
          </div>
        )}
        {/* 자동 태깅 안내 */}
        {isLoggedIn && (
          <p className="mt-2 text-xs text-gray-400 dark:text-gray-500 pl-12">
            작성 시 #{ticker} 태그가 자동으로 추가됩니다
          </p>
        )}
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
          {error}
          <button
            onClick={refetch}
            className="ml-2 underline hover:no-underline"
          >
            다시 시도
          </button>
        </div>
      )}

      {/* 게시글 목록 */}
      {isLoading && posts.length === 0 ? (
        /* 로딩 상태 */
        <div className="px-4 py-8 text-center">
          <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            게시글을 불러오는 중...
          </p>
        </div>
      ) : posts.length > 0 ? (
        /* 게시글 있음 */
        <div>
          {posts.map((post) => (
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
              showTickerPrice={false}  // 시세 페이지에서는 가격 숨김 (위에 이미 표시됨)
              showTickerCard={false}   // 시세 페이지에서는 티커 카드 숨김 (이미 종목 페이지에 있으므로)
              isLoggedIn={isLoggedIn}  // 로그인 상태 전달 (좋아요/댓글 기능 활성화용)
              onLoginRequired={handleLoginRequired}  // 비로그인 시 토스트 표시
              onClick={() => handlePostClick(post.id)}  // 클릭 시 상세 모달 열기
            />
          ))}
          {/* 더보기 버튼 (하단) */}
          {hasMore && (
            <div className="px-4 py-3 text-center border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={handleSeeMore}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                {stockName} 관련 글 더 보기 →
              </button>
            </div>
          )}
        </div>
      ) : (
        /* 빈 상태 */
        <div className="px-4 py-8 text-center">
          <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl">📝</span>
          </div>
          <p className="text-gray-900 dark:text-white font-medium mb-1">
            아직 이 종목에 대한 글이 없습니다
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            첫 번째 글을 작성해보세요!
          </p>
        </div>
      )}

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
    </section>
  );
}

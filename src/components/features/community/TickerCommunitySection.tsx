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

  // 아바타 이모지 선택 (이름의 첫 글자 기반)
  const avatarEmojis = ['👤', '😊', '🙂', '😎', '🤓', '👨‍💼', '👩‍💼', '🧑‍💻'];
  const authorName = post.author.name || '사용자';
  const avatarIndex = authorName.charCodeAt(0) % avatarEmojis.length;

  // avatarUrl이 URL인지 확인
  const isAvatarUrl = post.author.avatarUrl?.startsWith('http');
  const authorAvatar = isAvatarUrl ? post.author.avatarUrl : avatarEmojis[avatarIndex];

  // @handle: 고유 식별자
  const authorHandle = post.author.handle || post.userId.slice(0, 8);

  return {
    id: parseInt(post.id.replace(/-/g, '').slice(0, 8), 16) || Date.now(),
    author: authorName,
    username: authorHandle,
    authorAvatar: authorAvatar || avatarEmojis[avatarIndex],
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
  const { isLoggedIn, signInWithGoogle } = useAuth();

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
   */
  const handleAddComment = useCallback(async (postId: string, content: string): Promise<CommunityComment | null> => {
    try {
      const response = await fetch(`/api/community/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
  }, []);

  /**
   * 더보기 버튼 클릭 핸들러
   *
   * /community?ticker=AAPL 페이지로 이동
   */
  const handleSeeMore = () => {
    router.push(`/community?ticker=${ticker}`);
  };

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
              onLikeToggle={handleLikeToggle}
              onLoadComments={handleLoadComments}
              onAddComment={handleAddComment}
              showTickerPrice={false}  // 시세 페이지에서는 가격 숨김 (위에 이미 표시됨)
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
    </section>
  );
}

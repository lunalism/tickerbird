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
 */

import { useState } from 'react';
import {
  CommunityCategory,
  SortType,
  CommunityPost,
  FeedPost as FeedPostType,
} from '@/types/community';
import { Sidebar, BottomNav } from '@/components/layout';
import {
  CommunityTabs,
  CommunitySidebar,
  WriteButton,
  FeedPost,
  PostComposer,
} from '@/components/features/community';
import { hotPosts, discussionStocks, activeUsers } from '@/constants';
import { useAuthStore } from '@/stores';
import { useCommunity } from '@/hooks';

/**
 * CommunityPost를 FeedPost 형식으로 변환
 * 기존 FeedPost 컴포넌트와 호환성 유지
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
  const avatarIndex = post.author.name.charCodeAt(0) % avatarEmojis.length;

  return {
    id: parseInt(post.id.replace(/-/g, '').slice(0, 8), 16) || Date.now(),
    author: post.author.name,
    username: post.author.name.toLowerCase().replace(/\s+/g, '_'),
    authorAvatar: post.author.avatarUrl || avatarEmojis[avatarIndex],
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

export default function CommunityPage() {
  const [activeMenu, setActiveMenu] = useState('community');
  const [activeTab, setActiveTab] = useState<CommunityCategory>('all');
  const [sortType, setSortType] = useState<SortType>('latest');
  const { isLoggedIn, login } = useAuthStore();

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
  });

  // FeedPost 형식으로 변환
  const feedPosts = posts.map(toFeedPost);

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
                  onLoginRequest={login}
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
                {isLoading && feedPosts.length === 0 ? (
                  /* 로딩 상태 */
                  <div className="p-8 text-center">
                    <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">
                      게시글을 불러오는 중...
                    </p>
                  </div>
                ) : feedPosts.length > 0 ? (
                  feedPosts.map((post) => <FeedPost key={post.id} post={post} />)
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
    </div>
  );
}

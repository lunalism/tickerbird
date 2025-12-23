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
import { CommunityCategory, SortType } from '@/types/community';
import { Sidebar, BottomNav } from '@/components/layout';
import {
  CommunityTabs,
  CommunitySidebar,
  WriteButton,
  FeedPost,
  PostComposer,
} from '@/components/features/community';
import { feedPosts, hotPosts, discussionStocks, activeUsers } from '@/constants';
import { useAuthStore } from '@/stores';

export default function CommunityPage() {
  const [activeMenu, setActiveMenu] = useState('community');
  const [activeTab, setActiveTab] = useState<CommunityCategory>('all');
  const [sortType, setSortType] = useState<SortType>('latest');
  const { isLoggedIn, login } = useAuthStore();

  /**
   * 피드 필터링 및 정렬
   */
  const getFilteredPosts = () => {
    let filtered = [...feedPosts];

    // 카테고리 필터링
    if (activeTab !== 'all' && activeTab !== 'following') {
      filtered = filtered.filter((post) => post.category === activeTab);
    }

    // 팔로잉 탭은 현재 목업이므로 빈 결과 또는 일부만 표시
    if (activeTab === 'following') {
      // 팔로잉 기능 구현 전까지는 랜덤하게 일부만 표시
      filtered = filtered.filter((_, index) => index % 2 === 0);
    }

    // 정렬
    if (sortType === 'popular') {
      filtered.sort((a, b) => b.likes - a.likes);
    }
    // 최신순은 기본 순서 유지 (이미 최신순으로 정렬됨)

    return filtered;
  };

  const filteredPosts = getFilteredPosts();

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
                <PostComposer isLoggedIn={isLoggedIn} onLoginRequest={login} />
              </div>

              {/* 피드 리스트 */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                {filteredPosts.length > 0 ? (
                  filteredPosts.map((post) => <FeedPost key={post.id} post={post} />)
                ) : (
                  /* 빈 상태 */
                  <div className="p-8 text-center">
                    <div className="text-4xl mb-3">📭</div>
                    <p className="text-gray-500 dark:text-gray-400">
                      {activeTab === 'following'
                        ? '팔로우한 사용자의 글이 없습니다'
                        : '아직 게시물이 없습니다'}
                    </p>
                  </div>
                )}
              </div>

              {/* 더 보기 버튼 */}
              {filteredPosts.length > 0 && (
                <div className="text-center">
                  <button className="px-6 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    더 보기
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

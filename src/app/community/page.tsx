'use client';

import { useState } from 'react';
import { CommunityCategory } from '@/types';
import { Sidebar, BottomNav } from '@/components/layout';
import { CommunityTabs, PostList, CommunitySidebar, WriteButton } from '@/components/features/community';
import { posts, hotPosts, discussionStocks, activeUsers } from '@/constants';

export default function CommunityPage() {
  const [activeMenu, setActiveMenu] = useState('community');
  const [activeTab, setActiveTab] = useState<CommunityCategory>('all');

  const filteredPosts = activeTab === 'all'
    ? posts
    : posts.filter(post => post.category === activeTab);

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      {/* Sidebar - hidden on mobile */}
      <Sidebar activeMenu={activeMenu} onMenuChange={setActiveMenu} />

      {/* Bottom Navigation - visible only on mobile */}
      <BottomNav activeMenu={activeMenu} onMenuChange={setActiveMenu} />

      {/* Main Content */}
      <main className="md:pl-[72px] lg:pl-60 transition-all duration-300">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-6">
          {/* Page Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">커뮤니티</h1>
            <p className="text-gray-500 text-sm">투자자들과 정보를 나누고 토론하세요</p>
          </div>

          {/* Category Tabs */}
          <div className="mb-6">
            <CommunityTabs activeTab={activeTab} onTabChange={setActiveTab} />
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Post List */}
            <div className="lg:col-span-2">
              <PostList posts={filteredPosts} />

              {/* Load More */}
              <div className="mt-6 text-center">
                <button className="px-6 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                  더 보기
                </button>
              </div>
            </div>

            {/* Right Sidebar - Desktop only */}
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

      {/* Write Button (FAB) */}
      <WriteButton />
    </div>
  );
}

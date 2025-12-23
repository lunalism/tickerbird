'use client';

/**
 * CommunitySidebar 컴포넌트
 *
 * 커뮤니티 페이지 우측 사이드바입니다.
 * - 실시간 인기글
 * - 오늘의 토론 종목
 * - 활발한 유저
 */

import { useRouter } from 'next/navigation';
import { HotPost, DiscussionStock, ActiveUser } from '@/types';

interface CommunitySidebarProps {
  hotPosts: HotPost[];
  discussionStocks: DiscussionStock[];
  activeUsers: ActiveUser[];
}

export function CommunitySidebar({ hotPosts, discussionStocks, activeUsers }: CommunitySidebarProps) {
  const router = useRouter();

  return (
    <aside className="space-y-4 sticky top-6">
      {/* 실시간 인기글 */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <span>🔥</span>
          <span>실시간 인기글</span>
        </h3>
        <div className="space-y-1">
          {hotPosts.map((post, index) => (
            <div
              key={post.id}
              className="flex items-start gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700
                         p-2 rounded-lg transition-colors -mx-2"
            >
              {/* 순위 배지 */}
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  index < 3
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                }`}
              >
                {index + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 dark:text-gray-100 line-clamp-2">{post.title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  💬 {post.comments}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 오늘의 토론 종목 */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <span>📈</span>
          <span>토론 중인 종목</span>
        </h3>
        <div className="space-y-1">
          {discussionStocks.map((stock) => (
            <div
              key={stock.ticker}
              onClick={() => router.push(`/market/${stock.ticker}`)}
              className="flex items-center justify-between p-2 rounded-lg
                         hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors -mx-2"
            >
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{stock.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">${stock.ticker}</p>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                {stock.mentions}회
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 활발한 유저 */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <span>👥</span>
          <span>활발한 유저</span>
        </h3>
        <div className="space-y-1">
          {activeUsers.map((user) => (
            <div
              key={user.name}
              className="flex items-center gap-3 p-2 rounded-lg
                         hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors -mx-2"
            >
              {/* 아바타 */}
              <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-lg">
                {user.avatar}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">게시글 {user.posts}개</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

'use client';

import { HotPost, DiscussionStock, ActiveUser } from '@/types';

interface CommunitySidebarProps {
  hotPosts: HotPost[];
  discussionStocks: DiscussionStock[];
  activeUsers: ActiveUser[];
}

export function CommunitySidebar({ hotPosts, discussionStocks, activeUsers }: CommunitySidebarProps) {
  return (
    <aside className="space-y-4">
      {/* Hot Posts */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <span>🔥</span>
          <span>실시간 인기글</span>
        </h3>
        <div className="space-y-3">
          {hotPosts.map((post, index) => (
            <div
              key={post.id}
              className="flex items-start gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors -mx-2"
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                index < 3 ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500'
              }`}>
                {index + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 line-clamp-2">{post.title}</p>
                <p className="text-xs text-gray-500 mt-1">댓글 {post.comments}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Discussion Stocks */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <span>📈</span>
          <span>오늘의 토론 종목</span>
        </h3>
        <div className="space-y-2">
          {discussionStocks.map((stock) => (
            <div
              key={stock.ticker}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors -mx-2"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">{stock.name}</p>
                <p className="text-xs text-gray-500 font-mono">{stock.ticker}</p>
              </div>
              <span className="text-xs text-gray-500">{stock.mentions}회 언급</span>
            </div>
          ))}
        </div>
      </div>

      {/* Active Users */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <span>👥</span>
          <span>활발한 유저</span>
        </h3>
        <div className="space-y-2">
          {activeUsers.map((user) => (
            <div
              key={user.name}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors -mx-2"
            >
              <span className="text-2xl">{user.avatar}</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500">게시글 {user.posts}개</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

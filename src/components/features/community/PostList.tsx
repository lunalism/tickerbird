'use client';

import { Post } from '@/types';
import { CATEGORY_BADGE_COLORS } from '@/constants';

interface PostListProps {
  posts: Post[];
}

export function PostList({ posts }: PostListProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {posts.map((post, index) => (
        <article
          key={post.id}
          className={`p-4 hover:bg-blue-50/50 transition-colors cursor-pointer ${
            index !== posts.length - 1 ? 'border-b border-gray-100' : ''
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${
                    CATEGORY_BADGE_COLORS[post.categoryLabel] || 'bg-gray-100 text-gray-700'
                  }`}>
                    {post.categoryLabel}
                  </span>
                  {post.isHot && (
                    <span className="flex items-center gap-1 text-xs text-orange-500 font-medium">
                      <span>🔥</span>
                      <span>인기</span>
                    </span>
                  )}
                </div>
                {post.stock && (
                  <span className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-full transition-colors">
                    {post.stock.name} {post.stock.ticker}
                  </span>
                )}
              </div>
              <h3 className="font-medium text-gray-900 mb-2 line-clamp-1">
                {post.title}
              </h3>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span className="font-medium text-gray-700">{post.author}</span>
                <span>{post.createdAt}</span>
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  {post.views.toLocaleString()}
                </span>
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  {post.likes}
                </span>
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  {post.comments}
                </span>
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

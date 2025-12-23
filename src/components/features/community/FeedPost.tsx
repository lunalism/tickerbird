'use client';

/**
 * FeedPost 컴포넌트
 *
 * 트위터/X 스타일의 피드 포스트 카드입니다.
 *
 * 구조:
 * ┌─────────────────────────────────────────┐
 * │ 👤 프로필사진  닉네임 · @아이디 · 5분 전  │
 * │                                         │
 * │ 본문 내용 (최대 280자)                   │
 * │ $NVDA $TSLA 같은 종목 태그는 파란색 링크  │
 * │ #해시태그 도 파란색                       │
 * │                                         │
 * │ 📊 종목 미니 카드 (태그된 종목 정보)      │
 * │                                         │
 * │ ♡ 24    💬 12    🔄 8    🔖             │
 * └─────────────────────────────────────────┘
 */

import { useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { FeedPost as FeedPostType, StockTag } from '@/types/community';

interface FeedPostProps {
  post: FeedPostType;
}

export function FeedPost({ post }: FeedPostProps) {
  const router = useRouter();

  // 인터랙션 상태 (로컬)
  const [liked, setLiked] = useState(post.liked);
  const [likesCount, setLikesCount] = useState(post.likes);
  const [bookmarked, setBookmarked] = useState(post.bookmarked);
  const [reposted, setReposted] = useState(post.reposted);
  const [repostsCount, setRepostsCount] = useState(post.reposts);

  /**
   * 좋아요 토글
   */
  const handleLike = () => {
    setLiked(!liked);
    setLikesCount(liked ? likesCount - 1 : likesCount + 1);
  };

  /**
   * 북마크 토글
   */
  const handleBookmark = () => {
    setBookmarked(!bookmarked);
  };

  /**
   * 리포스트 토글
   */
  const handleRepost = () => {
    setReposted(!reposted);
    setRepostsCount(reposted ? repostsCount - 1 : repostsCount + 1);
  };

  /**
   * 본문 내용 파싱
   * $종목태그와 #해시태그를 링크로 변환
   */
  const parseContent = (content: string) => {
    // $종목태그 파싱 (파란색 링크)
    const stockTagRegex = /\$([A-Za-z0-9]+)/g;
    // #해시태그 파싱 (파란색)
    const hashtagRegex = /#([^\s#]+)/g;

    // 먼저 줄바꿈을 처리
    const lines = content.split('\n');

    return lines.map((line, lineIndex) => {
      const parts: ReactNode[] = [];
      let lastIndex = 0;
      let match;

      // $종목태그와 #해시태그를 찾아서 처리
      const combinedRegex = /(\$[A-Za-z0-9]+|#[^\s#]+)/g;

      while ((match = combinedRegex.exec(line)) !== null) {
        // 매치 전 텍스트
        if (match.index > lastIndex) {
          parts.push(line.slice(lastIndex, match.index));
        }

        const tag = match[1];
        if (tag.startsWith('$')) {
          // 종목 태그 링크
          const ticker = tag.slice(1);
          parts.push(
            <span
              key={`${lineIndex}-${match.index}`}
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/market/${ticker}`);
              }}
              className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer font-medium"
            >
              {tag}
            </span>
          );
        } else {
          // 해시태그
          parts.push(
            <span
              key={`${lineIndex}-${match.index}`}
              className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              {tag}
            </span>
          );
        }

        lastIndex = match.index + match[0].length;
      }

      // 남은 텍스트
      if (lastIndex < line.length) {
        parts.push(line.slice(lastIndex));
      }

      return (
        <span key={lineIndex}>
          {parts}
          {lineIndex < lines.length - 1 && <br />}
        </span>
      );
    });
  };

  /**
   * 종목 미니 카드 렌더링
   */
  const renderStockCard = (stock: StockTag) => {
    const isPositive = stock.changePercent >= 0;
    return (
      <div
        key={stock.ticker}
        onClick={(e) => {
          e.stopPropagation();
          router.push(`/market/${stock.ticker}`);
        }}
        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl
                   border border-gray-100 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700
                   transition-colors cursor-pointer"
      >
        {/* 종목 정보 */}
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-900 dark:text-white">{stock.ticker}</span>
          <span className="text-sm text-gray-500 dark:text-gray-400">{stock.name}</span>
        </div>

        {/* 가격 및 등락률 */}
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 dark:text-white">
            ${stock.price.toFixed(2)}
          </span>
          <span
            className={`text-sm font-medium px-2 py-0.5 rounded-full ${
              isPositive
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            }`}
          >
            {isPositive ? '+' : ''}
            {stock.changePercent.toFixed(2)}%
          </span>
          <span className="text-lg">{isPositive ? '📈' : '📉'}</span>
        </div>
      </div>
    );
  };

  return (
    <article
      className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700
                 hover:bg-gray-50/50 dark:hover:bg-gray-750 transition-colors cursor-pointer"
    >
      <div className="p-4">
        {/* 상단: 프로필 + 닉네임 + 시간 */}
        <div className="flex items-start gap-3">
          {/* 프로필 아바타 */}
          <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xl flex-shrink-0">
            {post.authorAvatar}
          </div>

          {/* 콘텐츠 영역 */}
          <div className="flex-1 min-w-0">
            {/* 작성자 정보 */}
            <div className="flex items-center gap-1 mb-1">
              <span className="font-semibold text-gray-900 dark:text-white truncate">
                {post.author}
              </span>
              <span className="text-gray-500 dark:text-gray-400 text-sm">
                @{post.username}
              </span>
              <span className="text-gray-400 dark:text-gray-500">·</span>
              <span className="text-gray-500 dark:text-gray-400 text-sm">
                {post.createdAt}
              </span>
              {post.isHot && (
                <span className="ml-1 text-orange-500 text-xs font-medium flex items-center gap-0.5">
                  🔥 인기
                </span>
              )}
            </div>

            {/* 본문 내용 */}
            <div className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap mb-3">
              {parseContent(post.content)}
            </div>

            {/* 종목 미니 카드 (태그된 종목이 있을 때) */}
            {post.stockTags.length > 0 && (
              <div className="space-y-2 mb-3">
                {post.stockTags.map(renderStockCard)}
              </div>
            )}

            {/* 인터랙션 버튼 */}
            <div className="flex items-center justify-between max-w-md -ml-2">
              {/* 좋아요 */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleLike();
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors
                  ${
                    liked
                      ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                      : 'text-gray-500 dark:text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                  }`}
              >
                <span className="text-lg">{liked ? '❤️' : '🤍'}</span>
                <span className="text-sm">{likesCount}</span>
              </button>

              {/* 댓글 */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // 상세 페이지로 이동
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-gray-500 dark:text-gray-400
                           hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
              >
                <span className="text-lg">💬</span>
                <span className="text-sm">{post.comments}</span>
              </button>

              {/* 리포스트 */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRepost();
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors
                  ${
                    reposted
                      ? 'text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20'
                      : 'text-gray-500 dark:text-gray-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20'
                  }`}
              >
                <span className="text-lg">🔄</span>
                <span className="text-sm">{repostsCount}</span>
              </button>

              {/* 북마크 */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleBookmark();
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors
                  ${
                    bookmarked
                      ? 'text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                      : 'text-gray-500 dark:text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                  }`}
              >
                <span className="text-lg">{bookmarked ? '🔖' : '📑'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

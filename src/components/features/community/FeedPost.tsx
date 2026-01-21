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
 * │                                         │
 * │ 💬 댓글 섹션 (펼침/접힘)                  │
 * └─────────────────────────────────────────┘
 */

import { useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { FeedPost as FeedPostType, StockTag, CommunityComment } from '@/types/community';
import { GlossaryText } from '@/components/ui';

interface FeedPostProps {
  post: FeedPostType;
  /** 실제 게시글 ID (Supabase UUID) - 없으면 API 호출 안함 */
  postId?: string;
  /** 좋아요 토글 콜백 */
  onLikeToggle?: (postId: string) => Promise<boolean>;
  /** 댓글 목록 조회 콜백 */
  onLoadComments?: (postId: string) => Promise<CommunityComment[]>;
  /** 댓글 작성 콜백 */
  onAddComment?: (postId: string, content: string) => Promise<CommunityComment | null>;
  /**
   * 티커 카드에 가격 표시 여부
   * - true: 가격 표시 (기본값, /community 페이지용)
   * - false: 가격 숨김 (/market/[ticker] 페이지 커뮤니티 섹션용 - 위에 가격 있어서 중복 방지)
   */
  showTickerPrice?: boolean;
}

export function FeedPost({ post, postId, onLikeToggle, onLoadComments, onAddComment, showTickerPrice = true }: FeedPostProps) {
  const router = useRouter();

  // 인터랙션 상태
  const [liked, setLiked] = useState(post.liked);
  const [likesCount, setLikesCount] = useState(post.likes);
  const [bookmarked, setBookmarked] = useState(post.bookmarked);
  const [reposted, setReposted] = useState(post.reposted);
  const [repostsCount, setRepostsCount] = useState(post.reposts);
  const [commentsCount, setCommentsCount] = useState(post.comments);

  // 댓글 관련 상태
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // 좋아요 로딩 상태
  const [isLiking, setIsLiking] = useState(false);

  /**
   * 좋아요 토글
   */
  const handleLike = async () => {
    if (isLiking) return;

    // API 콜백이 있으면 사용
    if (postId && onLikeToggle) {
      setIsLiking(true);
      try {
        const newLiked = await onLikeToggle(postId);
        setLiked(newLiked);
        setLikesCount(prev => newLiked ? prev + 1 : prev - 1);
      } catch {
        // 에러 시 UI 변경 안함
      } finally {
        setIsLiking(false);
      }
    } else {
      // 로컬 토글 (폴백)
      setLiked(!liked);
      setLikesCount(liked ? likesCount - 1 : likesCount + 1);
    }
  };

  /**
   * 댓글 섹션 토글
   */
  const handleToggleComments = async () => {
    const newShowComments = !showComments;
    setShowComments(newShowComments);

    // 댓글을 처음 열 때 로드
    if (newShowComments && comments.length === 0 && postId && onLoadComments) {
      setIsLoadingComments(true);
      try {
        const loadedComments = await onLoadComments(postId);
        setComments(loadedComments);
      } catch {
        // 에러 처리
      } finally {
        setIsLoadingComments(false);
      }
    }
  };

  /**
   * 댓글 작성
   */
  const handleSubmitComment = async () => {
    if (!commentInput.trim() || !postId || !onAddComment || isSubmittingComment) return;

    setIsSubmittingComment(true);
    try {
      const newComment = await onAddComment(postId, commentInput.trim());
      if (newComment) {
        setComments(prev => [...prev, newComment]);
        setCommentsCount(prev => prev + 1);
        setCommentInput('');
      }
    } catch {
      // 에러 처리
    } finally {
      setIsSubmittingComment(false);
    }
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
   * 일반 텍스트는 용어사전 툴팁 적용
   */
  const parseContent = (content: string) => {
    // 먼저 줄바꿈을 처리
    const lines = content.split('\n');

    return lines.map((line, lineIndex) => {
      const parts: ReactNode[] = [];
      let lastIndex = 0;
      let match;

      // $종목태그와 #해시태그를 찾아서 처리
      const combinedRegex = /(\$[A-Za-z0-9]+|#[^\s#]+)/g;

      while ((match = combinedRegex.exec(line)) !== null) {
        // 매치 전 텍스트 (용어사전 툴팁 적용)
        if (match.index > lastIndex) {
          const textBefore = line.slice(lastIndex, match.index);
          parts.push(
            <GlossaryText key={`text-${lineIndex}-${lastIndex}`}>
              {textBefore}
            </GlossaryText>
          );
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

      // 남은 텍스트 (용어사전 툴팁 적용)
      if (lastIndex < line.length) {
        const remainingText = line.slice(lastIndex);
        parts.push(
          <GlossaryText key={`text-${lineIndex}-${lastIndex}`}>
            {remainingText}
          </GlossaryText>
        );
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
   *
   * showTickerPrice 설정에 따른 동작:
   * - true (기본값): 가격 표시 (/community 페이지용)
   * - false: 가격 숨김 (/market/[ticker] 커뮤니티 섹션용 - 중복 방지)
   *
   * 가격 정보가 없는 경우 (price === 0):
   * - "시세 보기 →" 텍스트 표시
   * - 클릭 시 종목 상세 페이지로 이동
   */
  const renderStockCard = (stock: StockTag) => {
    const isPositive = stock.changePercent >= 0;
    const hasPrice = stock.price > 0;

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

        {/* 가격 영역 - showTickerPrice=false면 숨김 */}
        {showTickerPrice && (
          hasPrice ? (
            /* 가격 정보 있음 - 가격과 등락률 표시 */
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
          ) : (
            /* 가격 정보 없음 - 시세 보기 링크 표시 */
            <span className="text-sm text-blue-600 dark:text-blue-400">
              시세 보기 →
            </span>
          )
        )}

        {/* showTickerPrice=false일 때 화살표 아이콘만 표시 */}
        {!showTickerPrice && (
          <span className="text-gray-400 dark:text-gray-500">→</span>
        )}
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
          {/* 프로필 아바타 - URL이면 이미지, 아니면 이모지 텍스트 */}
          <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xl flex-shrink-0 overflow-hidden">
            {post.authorAvatar?.startsWith('http') ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={post.authorAvatar}
                alt={post.author}
                className="w-full h-full object-cover"
              />
            ) : (
              post.authorAvatar
            )}
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
                  handleToggleComments();
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors
                  ${showComments
                    ? 'text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                    : 'text-gray-500 dark:text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                  }`}
              >
                <span className="text-lg">💬</span>
                <span className="text-sm">{commentsCount}</span>
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

      {/* 댓글 섹션 */}
      {showComments && (
        <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700">
          {/* 댓글 입력창 */}
          {postId && onAddComment && (
            <div className="flex gap-3 pt-3 pb-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-sm flex-shrink-0">
                👤
              </div>
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmitComment();
                    }
                  }}
                  placeholder="댓글을 입력하세요..."
                  className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-full text-sm
                             text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400
                             focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onClick={(e) => e.stopPropagation()}
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSubmitComment();
                  }}
                  disabled={!commentInput.trim() || isSubmittingComment}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-full
                             hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmittingComment ? '...' : '게시'}
                </button>
              </div>
            </div>
          )}

          {/* 댓글 목록 */}
          <div className="space-y-3">
            {isLoadingComments ? (
              <div className="py-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                댓글을 불러오는 중...
              </div>
            ) : comments.length > 0 ? (
              comments.map((comment) => (
                <div key={comment.id} className="flex gap-3" onClick={(e) => e.stopPropagation()}>
                  <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-sm flex-shrink-0">
                    {comment.author.avatarUrl || '👤'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-medium text-sm text-gray-900 dark:text-white">
                        {comment.author.name}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatCommentTime(comment.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {comment.content}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                아직 댓글이 없습니다
              </div>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

/**
 * 댓글 시간 포맷
 */
function formatCommentTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return '방금 전';
  if (diffMins < 60) return `${diffMins}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;
  if (diffDays < 7) return `${diffDays}일 전`;
  return date.toLocaleDateString('ko-KR');
}

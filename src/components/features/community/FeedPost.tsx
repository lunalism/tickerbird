'use client';

/**
 * FeedPost 컴포넌트
 *
 * 트위터/X 스타일의 피드 포스트 카드입니다.
 *
 * 구조:
 * ┌─────────────────────────────────────────┐
 * │ 👤 프로필사진  닉네임 · @아이디 · 5분 전  ⋮│ ← 본인 글만 메뉴 표시 (1시간 내)
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

import { useState, useEffect, useRef, ReactNode, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { FeedPost as FeedPostType, StockTag, CommunityComment } from '@/types/community';
import { GlossaryText } from '@/components/ui';
import { StockCardWithPrice } from './StockCardWithPrice';
import { showSuccess, showError } from '@/lib/toast';

// 1시간 (밀리초)
const ONE_HOUR_MS = 60 * 60 * 1000;

interface FeedPostProps {
  post: FeedPostType;
  /** 실제 게시글 ID (Supabase UUID) - 없으면 API 호출 안함 */
  postId?: string;
  /** 현재 로그인한 사용자 ID (수정/삭제 권한 확인용) */
  currentUserId?: string;
  /** 좋아요 토글 콜백 */
  onLikeToggle?: (postId: string) => Promise<boolean>;
  /** 댓글 목록 조회 콜백 */
  onLoadComments?: (postId: string) => Promise<CommunityComment[]>;
  /** 댓글 작성 콜백 */
  onAddComment?: (postId: string, content: string) => Promise<CommunityComment | null>;
  /** 게시글 수정 콜백 */
  onEditPost?: (postId: string, content: string) => Promise<boolean>;
  /** 게시글 삭제 콜백 */
  onDeletePost?: (postId: string) => Promise<boolean>;
  /** 댓글 수정 콜백 */
  onEditComment?: (postId: string, commentId: string, content: string) => Promise<CommunityComment | null>;
  /** 댓글 삭제 콜백 */
  onDeleteComment?: (postId: string, commentId: string) => Promise<boolean>;
  /**
   * 티커 카드에 가격 표시 여부
   * - true: 가격 표시 (기본값, /community 페이지용)
   * - false: 가격 숨김 (/market/[ticker] 페이지 커뮤니티 섹션용 - 위에 가격 있어서 중복 방지)
   */
  showTickerPrice?: boolean;
  /**
   * 티커 카드 표시 여부
   * - true: 티커 카드 표시 (기본값)
   * - false: 티커 카드 완전 숨김 (/market/[ticker] 페이지 - 이미 종목 페이지에 있으므로)
   */
  showTickerCard?: boolean;
  /**
   * 티커 카드에서 실시간 가격 API 호출 여부
   * - true: 실시간 시세 API 호출하여 가격 표시 (/community 페이지용)
   * - false: 정적 가격 표시 또는 "시세 보기 →" (기본값)
   */
  fetchPrices?: boolean;
  /**
   * 로그인 상태 여부
   * - true: 좋아요/댓글 기능 활성화
   * - false: 클릭 시 로그인 유도 토스트 표시
   */
  isLoggedIn?: boolean;
  /**
   * 로그인 필요 시 호출되는 콜백
   * - 비로그인 상태에서 좋아요/댓글 클릭 시 호출
   */
  onLoginRequired?: () => void;
  /**
   * 게시글 클릭 콜백 (상세 모달 열기)
   * - 좋아요/댓글 버튼 클릭은 이 콜백을 트리거하지 않음
   */
  onClick?: () => void;
}

/**
 * 남은 시간 계산 (mm:ss 형식)
 * @param createdAtRaw - ISO 형식 생성 시간
 * @returns 남은 시간 문자열 또는 null (시간 만료)
 */
function getTimeRemaining(createdAtRaw: string): string | null {
  const now = Date.now();
  const created = new Date(createdAtRaw).getTime();
  const remaining = created + ONE_HOUR_MS - now;

  if (remaining <= 0) return null; // 시간 만료

  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * 수정/삭제 가능 여부 확인
 */
function canEditOrDelete(createdAtRaw: string): boolean {
  const now = Date.now();
  const created = new Date(createdAtRaw).getTime();
  return now - created < ONE_HOUR_MS;
}

/**
 * 드롭다운 메뉴 컴포넌트
 *
 * React Portal을 사용하여 body에 렌더링합니다.
 * 이렇게 하면 부모 요소의 overflow 설정에 영향받지 않습니다.
 *
 * @param isOpen - 메뉴 열림 상태
 * @param onClose - 메뉴 닫기 콜백
 * @param anchorRef - ⋮ 버튼 ref (위치 계산용)
 * @param timeRemaining - 남은 시간 (mm:ss 형식)
 * @param onEdit - 수정 버튼 클릭 콜백
 * @param onDelete - 삭제 버튼 클릭 콜백
 */
function DropdownMenu({
  isOpen,
  onClose,
  anchorRef,
  timeRemaining,
  onEdit,
  onDelete,
}: {
  isOpen: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  timeRemaining: string | null;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  // 드롭다운 위치 상태
  const [position, setPosition] = useState({ top: 0, left: 0 });
  // 클라이언트 사이드 렌더링 확인 (Portal용)
  const [mounted, setMounted] = useState(false);

  // 클라이언트 마운트 확인
  useEffect(() => {
    setMounted(true);
  }, []);

  // ⋮ 버튼 위치 기준으로 드롭다운 위치 계산
  // position: fixed 사용 시 getBoundingClientRect()가 반환하는 뷰포트 기준 좌표를 그대로 사용
  // (scrollY/scrollX 추가하면 안 됨!)
  useEffect(() => {
    if (!isOpen || !anchorRef.current) return;

    const updatePosition = () => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (rect) {
        setPosition({
          // 버튼 바로 아래에 위치 (뷰포트 기준)
          top: rect.bottom + 4,
          // 오른쪽 정렬 (버튼 오른쪽 끝 - 메뉴 너비)
          left: rect.right - 150,
        });
      }
    };

    updatePosition();
    // 스크롤/리사이즈 시 위치 업데이트
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen, anchorRef]);

  // 외부 클릭 시 닫기
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose, anchorRef]);

  // 서버 사이드 또는 닫힌 상태면 렌더링 안함
  if (!isOpen || !mounted) return null;

  // Portal로 body에 렌더링
  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-[9999] bg-white dark:bg-gray-800 rounded-xl
                 shadow-lg border border-gray-200 dark:border-gray-700 py-2 min-w-[150px]"
      style={{
        top: position.top,
        left: position.left,
        animation: 'fadeIn 0.15s ease-out',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* 수정 버튼 - 남은 시간 표시 */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
          onClose();
        }}
        className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-200
                   hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
      >
        <span>✏️</span>
        <span>수정</span>
        {timeRemaining && (
          <span className="ml-auto text-xs text-gray-500 dark:text-gray-400 font-mono">
            {timeRemaining}
          </span>
        )}
      </button>
      {/* 삭제 버튼 */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
          onClose();
        }}
        className="w-full px-4 py-2.5 text-left text-sm text-red-600 dark:text-red-400
                   hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
      >
        <span>🗑️</span>
        <span>삭제</span>
      </button>
    </div>,
    document.body
  );
}

/**
 * 삭제 확인 모달 컴포넌트
 *
 * 삭제 버튼 상태:
 * - 기본: [삭제]
 * - 삭제 중: [🔄 삭제 중...] (스피너 + 텍스트, 버튼 비활성화)
 */
function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
  type,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
  type: 'post' | 'comment';
}) {
  if (!isOpen) return null;

  const typeLabel = type === 'post' ? '게시글' : '댓글';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl
                   animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
          {typeLabel} 삭제
        </h3>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          정말 이 {typeLabel}을 삭제하시겠습니까?
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700
                       rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 px-4 py-2 text-white bg-red-500 rounded-xl hover:bg-red-600
                       transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center justify-center gap-2"
          >
            {isDeleting ? (
              <>
                {/* 로딩 스피너 */}
                <svg
                  className="animate-spin h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>삭제 중...</span>
              </>
            ) : (
              '삭제'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export function FeedPost({
  post,
  postId,
  currentUserId,
  onLikeToggle,
  onLoadComments,
  onAddComment,
  onEditPost,
  onDeletePost,
  onEditComment,
  onDeleteComment,
  showTickerPrice = true,
  showTickerCard = true,
  fetchPrices = false,
  isLoggedIn = false,
  onLoginRequired,
  onClick,
}: FeedPostProps) {
  const router = useRouter();

  // 인터랙션 상태 (좋아요, 댓글만 사용 - 리포스트/북마크 제거됨)
  const [liked, setLiked] = useState(post.liked);
  const [likesCount, setLikesCount] = useState(post.likes);
  const [commentsCount, setCommentsCount] = useState(post.comments);

  // 댓글 관련 상태
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // 좋아요 로딩 상태
  const [isLiking, setIsLiking] = useState(false);

  // 프로필 이미지 로딩 에러 상태
  const [authorImageError, setAuthorImageError] = useState(false);
  const [commentImageErrors, setCommentImageErrors] = useState<Record<string, boolean>>({});

  // 게시글 수정/삭제 관련 상태
  const [showPostMenu, setShowPostMenu] = useState(false);
  const [isEditingPost, setIsEditingPost] = useState(false);
  const [editPostContent, setEditPostContent] = useState(post.content);
  const [isSavingPost, setIsSavingPost] = useState(false);
  const [showDeletePostModal, setShowDeletePostModal] = useState(false);
  const [isDeletingPost, setIsDeletingPost] = useState(false);
  const [isPostDeleted, setIsPostDeleted] = useState(false);

  // 댓글 수정/삭제 관련 상태
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentContent, setEditCommentContent] = useState('');
  const [isSavingComment, setIsSavingComment] = useState(false);
  const [showCommentMenu, setShowCommentMenu] = useState<string | null>(null);
  const [showDeleteCommentModal, setShowDeleteCommentModal] = useState<string | null>(null);
  const [isDeletingComment, setIsDeletingComment] = useState(false);

  // ⋮ 메뉴 버튼 refs (드롭다운 위치 계산용)
  const postMenuButtonRef = useRef<HTMLButtonElement>(null);
  // 댓글 메뉴 버튼 refs (댓글 ID를 키로 사용)
  const commentMenuButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // 남은 시간 상태 (실시간 업데이트)
  const [postTimeRemaining, setPostTimeRemaining] = useState<string | null>(null);
  const [commentTimeRemaining, setCommentTimeRemaining] = useState<Record<string, string | null>>({});

  // 본인 게시글인지 확인
  const isOwnPost = currentUserId && post.userId && currentUserId === post.userId;
  // 게시글 수정/삭제 가능 여부
  const canEditPost = isOwnPost && post.createdAtRaw && canEditOrDelete(post.createdAtRaw);

  // 남은 시간 실시간 업데이트 (게시글)
  useEffect(() => {
    if (!canEditPost || !post.createdAtRaw) return;

    const updateTime = () => {
      const remaining = getTimeRemaining(post.createdAtRaw!);
      setPostTimeRemaining(remaining);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [canEditPost, post.createdAtRaw]);

  // 남은 시간 실시간 업데이트 (댓글)
  useEffect(() => {
    if (comments.length === 0) return;

    const updateTimes = () => {
      const newTimeRemaining: Record<string, string | null> = {};
      comments.forEach((comment) => {
        if (currentUserId && comment.userId === currentUserId && comment.createdAt) {
          newTimeRemaining[comment.id] = getTimeRemaining(comment.createdAt);
        }
      });
      setCommentTimeRemaining(newTimeRemaining);
    };

    updateTimes();
    const interval = setInterval(updateTimes, 1000);
    return () => clearInterval(interval);
  }, [comments, currentUserId]);

  /**
   * 좋아요 토글
   */
  const handleLike = async () => {
    if (!isLoggedIn) {
      onLoginRequired?.();
      return;
    }

    if (isLiking) return;

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
    if (!isLoggedIn) {
      onLoginRequired?.();
      return;
    }

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
   * 게시글 수정 저장
   */
  const handleSavePostEdit = useCallback(async () => {
    if (!postId || !onEditPost || isSavingPost) return;
    if (!editPostContent.trim()) return;

    setIsSavingPost(true);
    try {
      const success = await onEditPost(postId, editPostContent.trim());
      if (success) {
        setIsEditingPost(false);
      }
    } catch {
      // 에러 처리
    } finally {
      setIsSavingPost(false);
    }
  }, [postId, onEditPost, isSavingPost, editPostContent]);

  /**
   * 게시글 삭제 확인
   *
   * 삭제 성공/실패 시 토스트 메시지 표시
   */
  const handleConfirmDeletePost = useCallback(async () => {
    if (!postId || !onDeletePost || isDeletingPost) return;

    setIsDeletingPost(true);
    try {
      const success = await onDeletePost(postId);
      if (success) {
        setShowDeletePostModal(false);
        setIsPostDeleted(true);
        showSuccess('게시글이 삭제되었습니다');
      } else {
        showError('게시글 삭제에 실패했습니다');
      }
    } catch {
      showError('게시글 삭제 중 오류가 발생했습니다');
    } finally {
      setIsDeletingPost(false);
    }
  }, [postId, onDeletePost, isDeletingPost]);

  /**
   * 댓글 수정 시작
   */
  const handleStartEditComment = (comment: CommunityComment) => {
    setEditingCommentId(comment.id);
    setEditCommentContent(comment.content);
    setShowCommentMenu(null);
  };

  /**
   * 댓글 수정 저장
   */
  const handleSaveCommentEdit = useCallback(async (commentId: string) => {
    if (!postId || !onEditComment || isSavingComment) return;
    if (!editCommentContent.trim()) return;

    setIsSavingComment(true);
    try {
      const updatedComment = await onEditComment(postId, commentId, editCommentContent.trim());
      if (updatedComment) {
        setComments(prev =>
          prev.map(c => (c.id === commentId ? updatedComment : c))
        );
        setEditingCommentId(null);
        setEditCommentContent('');
      }
    } catch {
      // 에러 처리
    } finally {
      setIsSavingComment(false);
    }
  }, [postId, onEditComment, isSavingComment, editCommentContent]);

  /**
   * 댓글 삭제 확인
   *
   * 삭제 성공/실패 시 토스트 메시지 표시
   */
  const handleConfirmDeleteComment = useCallback(async (commentId: string) => {
    if (!postId || !onDeleteComment || isDeletingComment) return;

    setIsDeletingComment(true);
    try {
      const success = await onDeleteComment(postId, commentId);
      if (success) {
        setComments(prev => prev.filter(c => c.id !== commentId));
        setCommentsCount(prev => prev - 1);
        setShowDeleteCommentModal(null);
        showSuccess('댓글이 삭제되었습니다');
      } else {
        showError('댓글 삭제에 실패했습니다');
      }
    } catch {
      showError('댓글 삭제 중 오류가 발생했습니다');
    } finally {
      setIsDeletingComment(false);
    }
  }, [postId, onDeleteComment, isDeletingComment]);

  /**
   * 본문 내용 파싱
   */
  const parseContent = (content: string) => {
    const lines = content.split('\n');

    return lines.map((line, lineIndex) => {
      const parts: ReactNode[] = [];
      let lastIndex = 0;
      let match;

      const combinedRegex = /(\$[A-Za-z0-9]+|#[^\s#]+)/g;

      while ((match = combinedRegex.exec(line)) !== null) {
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
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-900 dark:text-white">{stock.ticker}</span>
          <span className="text-sm text-gray-500 dark:text-gray-400">{stock.name}</span>
        </div>

        {showTickerPrice && (
          hasPrice ? (
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
            <span className="text-sm text-blue-600 dark:text-blue-400">
              시세 보기 →
            </span>
          )
        )}

        {!showTickerPrice && (
          <span className="text-gray-400 dark:text-gray-500">→</span>
        )}
      </div>
    );
  };

  // 삭제된 게시글이면 표시하지 않음
  if (isPostDeleted) {
    return null;
  }

  return (
    <article
      onClick={onClick}
      className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700
                 hover:bg-gray-50/50 dark:hover:bg-gray-750 transition-colors cursor-pointer"
    >
      <div className="p-4">
        {/* 상단: 프로필 + 닉네임 + 시간 + 메뉴 */}
        <div className="flex items-start gap-3">
          {/* 프로필 아바타 */}
          <div className="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden">
            {(() => {
              const isImageUrl = post.authorAvatar?.startsWith('http') || post.authorAvatar?.startsWith('/avatars/');
              const isEmoji = post.authorAvatar && !isImageUrl;

              if (isImageUrl && !authorImageError) {
                return (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={post.authorAvatar}
                    alt={post.author}
                    className="w-full h-full object-cover"
                    onError={() => setAuthorImageError(true)}
                  />
                );
              }

              if (isEmoji) {
                return (
                  <div className="w-full h-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xl">
                    {post.authorAvatar}
                  </div>
                );
              }

              return (
                <div className="w-full h-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <span className="text-white font-bold text-base">
                    {post.author?.charAt(0).toUpperCase() || '?'}
                  </span>
                </div>
              );
            })()}
          </div>

          {/* 콘텐츠 영역 */}
          <div className="flex-1 min-w-0">
            {/* 작성자 정보 + 메뉴 버튼 */}
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

              {/* ⋮ 메뉴 버튼 - 본인 게시글 + 1시간 이내만 표시 */}
              {canEditPost && (
                <div className="relative ml-auto">
                  <button
                    ref={postMenuButtonRef}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowPostMenu(!showPostMenu);
                    }}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200
                               hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                  >
                    <span className="text-lg leading-none">⋮</span>
                  </button>
                  <DropdownMenu
                    isOpen={showPostMenu}
                    onClose={() => setShowPostMenu(false)}
                    anchorRef={postMenuButtonRef}
                    timeRemaining={postTimeRemaining}
                    onEdit={() => {
                      setIsEditingPost(true);
                      setEditPostContent(post.content);
                    }}
                    onDelete={() => setShowDeletePostModal(true)}
                  />
                </div>
              )}
            </div>

            {/* 본문 내용 - 수정 모드 또는 일반 모드 */}
            {isEditingPost ? (
              <div className="mb-3" onClick={(e) => e.stopPropagation()}>
                <textarea
                  value={editPostContent}
                  onChange={(e) => setEditPostContent(e.target.value)}
                  className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600
                             rounded-xl text-gray-900 dark:text-white resize-none focus:outline-none
                             focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  maxLength={500}
                />
                <div className="flex justify-end gap-2 mt-2">
                  <button
                    onClick={() => {
                      setIsEditingPost(false);
                      setEditPostContent(post.content);
                    }}
                    className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100
                               dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleSavePostEdit}
                    disabled={isSavingPost || !editPostContent.trim()}
                    className="px-4 py-2 text-sm text-white bg-blue-500 hover:bg-blue-600 rounded-lg
                               transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSavingPost ? '저장 중...' : '저장'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap mb-3">
                {parseContent(post.content)}
              </div>
            )}

            {/* 종목 미니 카드 */}
            {showTickerCard && post.stockTags.length > 0 && !isEditingPost && (
              <div className="space-y-2 mb-3">
                {fetchPrices
                  ? post.stockTags.map((stock) => (
                      <StockCardWithPrice
                        key={stock.ticker}
                        ticker={stock.ticker}
                        name={stock.name}
                      />
                    ))
                  : post.stockTags.map(renderStockCard)
                }
              </div>
            )}

            {/* 인터랙션 버튼 */}
            {!isEditingPost && (
              <div className="flex items-center gap-2 -ml-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLike();
                  }}
                  disabled={isLiking}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors
                    ${
                      liked
                        ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                        : 'text-gray-500 dark:text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                    }
                    ${isLiking ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span className="text-lg">{liked ? '❤️' : '🤍'}</span>
                  <span className="text-sm">{likesCount}</span>
                </button>

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
              </div>
            )}
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
              comments.map((comment) => {
                // 본인 댓글인지 확인
                const isOwnComment = currentUserId && comment.userId === currentUserId;
                // 댓글 수정/삭제 가능 여부 (1시간 이내)
                const canEditComment = isOwnComment && comment.createdAt && canEditOrDelete(comment.createdAt);
                // 댓글 수정 중인지 확인
                const isEditingThisComment = editingCommentId === comment.id;

                return (
                  <div key={comment.id} className="flex gap-3" onClick={(e) => e.stopPropagation()}>
                    {/* 댓글 작성자 아바타 */}
                    <div className="w-8 h-8 rounded-full flex-shrink-0 overflow-hidden">
                      {(() => {
                        const isImageUrl = comment.author.avatarUrl?.startsWith('http') || comment.author.avatarUrl?.startsWith('/avatars/');
                        const hasImageError = commentImageErrors[comment.id];

                        if (isImageUrl && !hasImageError) {
                          return (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={comment.author.avatarUrl!}
                              alt={comment.author.name}
                              className="w-full h-full object-cover"
                              onError={() => {
                                setCommentImageErrors(prev => ({
                                  ...prev,
                                  [comment.id]: true,
                                }));
                              }}
                            />
                          );
                        }

                        return (
                          <div className="w-full h-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                            <span className="text-white font-bold text-sm">
                              {comment.author.name?.charAt(0).toUpperCase() || '?'}
                            </span>
                          </div>
                        );
                      })()}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* 댓글 헤더: 작성자 + 시간 + 메뉴 */}
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-medium text-sm text-gray-900 dark:text-white">
                          {comment.author.name}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          @{comment.author.handle}
                        </span>
                        <span className="text-gray-400 dark:text-gray-500">·</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatCommentTime(comment.createdAt)}
                        </span>

                        {/* ⋮ 메뉴 버튼 - 본인 댓글 + 1시간 이내만 표시 */}
                        {canEditComment && !isEditingThisComment && (
                          <div className="relative ml-auto">
                            <button
                              ref={(el) => {
                                // callback ref로 댓글별 버튼 ref 저장
                                if (el) {
                                  commentMenuButtonRefs.current.set(comment.id, el);
                                } else {
                                  commentMenuButtonRefs.current.delete(comment.id);
                                }
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowCommentMenu(showCommentMenu === comment.id ? null : comment.id);
                              }}
                              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200
                                         hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                            >
                              <span className="text-base leading-none">⋮</span>
                            </button>
                            <DropdownMenu
                              isOpen={showCommentMenu === comment.id}
                              onClose={() => setShowCommentMenu(null)}
                              anchorRef={{ current: commentMenuButtonRefs.current.get(comment.id) || null }}
                              timeRemaining={commentTimeRemaining[comment.id] || null}
                              onEdit={() => handleStartEditComment(comment)}
                              onDelete={() => {
                                setShowCommentMenu(null);
                                setShowDeleteCommentModal(comment.id);
                              }}
                            />
                          </div>
                        )}
                      </div>

                      {/* 댓글 내용 - 수정 모드 또는 일반 모드 */}
                      {isEditingThisComment ? (
                        <div className="mt-1">
                          <input
                            type="text"
                            value={editCommentContent}
                            onChange={(e) => setEditCommentContent(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200
                                       dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white
                                       focus:outline-none focus:ring-2 focus:ring-blue-500"
                            maxLength={300}
                            autoFocus
                          />
                          <div className="flex justify-end gap-2 mt-2">
                            <button
                              onClick={() => {
                                setEditingCommentId(null);
                                setEditCommentContent('');
                              }}
                              className="px-3 py-1 text-xs text-gray-600 dark:text-gray-300
                                         hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                              취소
                            </button>
                            <button
                              onClick={() => handleSaveCommentEdit(comment.id)}
                              disabled={isSavingComment || !editCommentContent.trim()}
                              className="px-3 py-1 text-xs text-white bg-blue-500 hover:bg-blue-600
                                         rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isSavingComment ? '저장 중...' : '저장'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                          {comment.content}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                아직 댓글이 없습니다
              </div>
            )}
          </div>
        </div>
      )}

      {/* 게시글 삭제 확인 모달 */}
      <DeleteConfirmModal
        isOpen={showDeletePostModal}
        onClose={() => setShowDeletePostModal(false)}
        onConfirm={handleConfirmDeletePost}
        isDeleting={isDeletingPost}
        type="post"
      />

      {/* 댓글 삭제 확인 모달 */}
      <DeleteConfirmModal
        isOpen={showDeleteCommentModal !== null}
        onClose={() => setShowDeleteCommentModal(null)}
        onConfirm={() => showDeleteCommentModal && handleConfirmDeleteComment(showDeleteCommentModal)}
        isDeleting={isDeletingComment}
        type="comment"
      />
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

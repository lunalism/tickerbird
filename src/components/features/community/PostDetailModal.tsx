'use client';

/**
 * PostDetailModal 컴포넌트
 *
 * 게시글 상세 내용을 모달로 표시합니다.
 * 뉴스 상세 모달과 유사한 스타일로 구현되었습니다.
 *
 * 레이아웃:
 * ┌─────────────────────────────────────┐
 * │ [카테고리 뱃지]              ☆  ⋮  │ ← 북마크, 메뉴(본인만)
 * │ 2026. 01. 24. 10:30:45              │
 * │                                     │
 * │ 🐂 아기상어 @chrisholic22           │
 * │                                     │
 * │ 게시글 전체 내용...                  │
 * │                                     │
 * │ ┌─────────────────────────────┐    │
 * │ │ 써모피셔 TMO  $625.98 -2.11%│    │ ← 종목 카드 (있으면)
 * │ └─────────────────────────────┘    │
 * │                                     │
 * │ ♡ 5  💬 3                           │
 * │─────────────────────────────────────│
 * │ 댓글 목록                           │
 * │─────────────────────────────────────│
 * │ [댓글 입력창]                [게시] │ ← 하단 고정
 * └─────────────────────────────────────┘
 *
 * 닫기:
 * - X 버튼 클릭
 * - 배경(오버레이) 클릭
 * - ESC 키
 */

import { useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { FeedPost as FeedPostType, StockTag, CommunityComment } from '@/types/community';
import { GlossaryText } from '@/components/ui';
import { StockCardWithPrice } from './StockCardWithPrice';

// 1시간 (밀리초)
const ONE_HOUR_MS = 60 * 60 * 1000;

interface PostDetailModalProps {
  /** 표시할 게시글 */
  post: FeedPostType;
  /** 실제 게시글 ID (Supabase UUID) */
  postId: string;
  /** 현재 로그인한 사용자 ID */
  currentUserId?: string;
  /** 모달 열림 상태 */
  isOpen: boolean;
  /** 모달 닫기 콜백 */
  onClose: () => void;
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
  /** 로그인 상태 여부 */
  isLoggedIn?: boolean;
  /** 로그인 필요 시 호출되는 콜백 */
  onLoginRequired?: () => void;
}

/**
 * 카테고리별 스타일을 반환합니다.
 */
function getCategoryStyle(category: string): string {
  const styles: Record<string, string> = {
    stock: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    strategy: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    qna: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  };
  return styles[category] || styles.stock;
}

/**
 * 카테고리별 라벨을 반환합니다.
 */
function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    stock: '종목토론',
    strategy: '투자전략',
    qna: 'Q&A',
    all: '전체',
    following: '팔로잉',
  };
  return labels[category] || '게시글';
}

/**
 * 날짜를 상세 형식으로 포맷합니다.
 */
function formatDetailDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).replace(/\./g, '.').replace(',', '');
}

/**
 * 남은 시간 계산 (mm:ss 형식)
 */
function getTimeRemaining(createdAtRaw: string): string | null {
  const now = Date.now();
  const created = new Date(createdAtRaw).getTime();
  const remaining = created + ONE_HOUR_MS - now;

  if (remaining <= 0) return null;

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

/**
 * 드롭다운 메뉴 컴포넌트
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
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen || !anchorRef.current) return;

    const updatePosition = () => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (rect) {
        setPosition({
          top: rect.bottom + 4,
          left: rect.right - 150,
        });
      }
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen, anchorRef]);

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

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-[10000] bg-white dark:bg-gray-800 rounded-xl
                 shadow-lg border border-gray-200 dark:border-gray-700 py-2 min-w-[150px]"
      style={{
        top: position.top,
        left: position.left,
        animation: 'fadeIn 0.15s ease-out',
      }}
      onClick={(e) => e.stopPropagation()}
    >
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

  return createPortal(
    <div
      className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl"
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
                       transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? '삭제 중...' : '삭제'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function PostDetailModal({
  post,
  postId,
  currentUserId,
  isOpen,
  onClose,
  onLikeToggle,
  onLoadComments,
  onAddComment,
  onEditPost,
  onDeletePost,
  onEditComment,
  onDeleteComment,
  isLoggedIn = false,
  onLoginRequired,
}: PostDetailModalProps) {
  const router = useRouter();
  const modalRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  // 좋아요 상태
  const [liked, setLiked] = useState(post.liked);
  const [likesCount, setLikesCount] = useState(post.likes);
  const [isLiking, setIsLiking] = useState(false);

  // 북마크 상태
  const [bookmarked, setBookmarked] = useState(post.bookmarked);

  // 댓글 관련 상태
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentsCount, setCommentsCount] = useState(post.comments);

  // 프로필 이미지 에러 상태
  const [authorImageError, setAuthorImageError] = useState(false);
  const [commentImageErrors, setCommentImageErrors] = useState<Record<string, boolean>>({});

  // 게시글 수정/삭제 관련 상태
  const [showPostMenu, setShowPostMenu] = useState(false);
  const [isEditingPost, setIsEditingPost] = useState(false);
  const [editPostContent, setEditPostContent] = useState(post.content);
  const [isSavingPost, setIsSavingPost] = useState(false);
  const [showDeletePostModal, setShowDeletePostModal] = useState(false);
  const [isDeletingPost, setIsDeletingPost] = useState(false);

  // 댓글 수정/삭제 관련 상태
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentContent, setEditCommentContent] = useState('');
  const [isSavingComment, setIsSavingComment] = useState(false);
  const [showCommentMenu, setShowCommentMenu] = useState<string | null>(null);
  const [showDeleteCommentModal, setShowDeleteCommentModal] = useState<string | null>(null);
  const [isDeletingComment, setIsDeletingComment] = useState(false);

  // ⋮ 메뉴 버튼 refs
  const postMenuButtonRef = useRef<HTMLButtonElement>(null);
  const commentMenuButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // 남은 시간 상태 (실시간 업데이트)
  const [postTimeRemaining, setPostTimeRemaining] = useState<string | null>(null);
  const [commentTimeRemaining, setCommentTimeRemaining] = useState<Record<string, string | null>>({});

  // 본인 게시글인지 확인
  const isOwnPost = currentUserId && post.userId && currentUserId === post.userId;
  // 게시글 수정/삭제 가능 여부
  const canEditPost = isOwnPost && post.createdAtRaw && canEditOrDelete(post.createdAtRaw);

  // 클라이언트 마운트 확인
  useEffect(() => {
    setMounted(true);
  }, []);

  // post 변경 시 상태 동기화
  useEffect(() => {
    setLiked(post.liked);
    setLikesCount(post.likes);
    setCommentsCount(post.comments);
    setBookmarked(post.bookmarked);
    setEditPostContent(post.content);
  }, [post]);

  // 모달 열릴 때 댓글 로드
  useEffect(() => {
    if (isOpen && onLoadComments) {
      setIsLoadingComments(true);
      onLoadComments(postId)
        .then((loadedComments) => {
          setComments(loadedComments);
        })
        .catch(() => {
          // 에러 처리
        })
        .finally(() => {
          setIsLoadingComments(false);
        });
    }
  }, [isOpen, postId, onLoadComments]);

  // ESC 키로 모달 닫기
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // 모달 열릴 때 바디 스크롤 방지
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

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

    if (onLikeToggle) {
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

    if (!commentInput.trim() || !onAddComment || isSubmittingComment) return;

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
    if (!onEditPost || isSavingPost) return;
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
   */
  const handleConfirmDeletePost = useCallback(async () => {
    if (!onDeletePost || isDeletingPost) return;

    setIsDeletingPost(true);
    try {
      const success = await onDeletePost(postId);
      if (success) {
        setShowDeletePostModal(false);
        onClose(); // 모달 닫기
      }
    } catch {
      // 에러 처리
    } finally {
      setIsDeletingPost(false);
    }
  }, [postId, onDeletePost, isDeletingPost, onClose]);

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
    if (!onEditComment || isSavingComment) return;
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
   */
  const handleConfirmDeleteComment = useCallback(async (commentId: string) => {
    if (!onDeleteComment || isDeletingComment) return;

    setIsDeletingComment(true);
    try {
      const success = await onDeleteComment(postId, commentId);
      if (success) {
        setComments(prev => prev.filter(c => c.id !== commentId));
        setCommentsCount(prev => prev - 1);
        setShowDeleteCommentModal(null);
      }
    } catch {
      // 에러 처리
    } finally {
      setIsDeletingComment(false);
    }
  }, [postId, onDeleteComment, isDeletingComment]);

  /**
   * 본문 내용 파싱 (종목 태그, 해시태그)
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
                onClose();
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

  // 서버 사이드 또는 닫힌 상태면 렌더링 안함
  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      onClick={onClose}
    >
      {/* 오버레이 */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* 모달 컨테이너 */}
      <div
        ref={modalRef}
        className="relative bg-white dark:bg-gray-800 w-full max-w-2xl max-h-[90vh] mx-4
                   rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ animation: 'fadeIn 0.2s ease-out' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ========================================
            헤더 영역
            ======================================== */}
        <div className="flex-shrink-0 p-4 border-b border-gray-100 dark:border-gray-700">
          {/* 상단: 카테고리 뱃지 + 버튼들 */}
          <div className="flex items-center justify-between mb-2">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${getCategoryStyle(post.category)}`}
            >
              {getCategoryLabel(post.category)}
            </span>

            <div className="flex items-center gap-2">
              {/* 북마크 버튼 */}
              <button
                onClick={() => setBookmarked(!bookmarked)}
                className={`p-2 rounded-full transition-colors ${
                  bookmarked
                    ? 'text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
                    : 'text-gray-400 hover:text-yellow-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <span className="text-lg">{bookmarked ? '⭐' : '☆'}</span>
              </button>

              {/* ⋮ 메뉴 버튼 - 본인 게시글 + 1시간 이내만 표시 */}
              {canEditPost && (
                <button
                  ref={postMenuButtonRef}
                  onClick={() => setShowPostMenu(!showPostMenu)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200
                             hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                >
                  <span className="text-lg leading-none">⋮</span>
                </button>
              )}

              {/* X 닫기 버튼 */}
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200
                           hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* 날짜/시간 */}
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            {post.createdAtRaw ? formatDetailDate(post.createdAtRaw) : post.createdAt}
          </div>

          {/* 작성자 정보 */}
          <div className="flex items-center gap-3">
            {/* 프로필 아바타 */}
            <div className="w-12 h-12 rounded-full flex-shrink-0 overflow-hidden">
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
                    <div className="w-full h-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-2xl">
                      {post.authorAvatar}
                    </div>
                  );
                }

                return (
                  <div className="w-full h-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                    <span className="text-white font-bold text-lg">
                      {post.author?.charAt(0).toUpperCase() || '?'}
                    </span>
                  </div>
                );
              })()}
            </div>

            <div>
              <div className="font-semibold text-gray-900 dark:text-white">
                {post.author}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                @{post.username}
              </div>
            </div>
          </div>
        </div>

        {/* ========================================
            본문 + 댓글 (스크롤 영역)
            ======================================== */}
        <div className="flex-1 overflow-y-auto">
          {/* 본문 영역 */}
          <div className="p-4">
            {/* 본문 내용 - 수정 모드 또는 일반 모드 */}
            {isEditingPost ? (
              <div className="mb-4">
                <textarea
                  value={editPostContent}
                  onChange={(e) => setEditPostContent(e.target.value)}
                  className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600
                             rounded-xl text-gray-900 dark:text-white resize-none focus:outline-none
                             focus:ring-2 focus:ring-blue-500"
                  rows={6}
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
              <div className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap text-base leading-relaxed mb-4">
                {parseContent(post.content)}
              </div>
            )}

            {/* 종목 카드 */}
            {!isEditingPost && post.stockTags.length > 0 && (
              <div className="space-y-2 mb-4">
                {post.stockTags.map((stock) => (
                  <StockCardWithPrice
                    key={stock.ticker}
                    ticker={stock.ticker}
                    name={stock.name}
                  />
                ))}
              </div>
            )}

            {/* 좋아요/댓글 카운트 */}
            <div className="flex items-center gap-4 py-3 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={handleLike}
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
                <span className="text-sm font-medium">{likesCount}</span>
              </button>

              <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                <span className="text-lg">💬</span>
                <span className="text-sm font-medium">{commentsCount}</span>
              </div>
            </div>
          </div>

          {/* 댓글 목록 */}
          <div className="border-t border-gray-100 dark:border-gray-700">
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                댓글 {commentsCount}개
              </h3>

              {isLoadingComments ? (
                <div className="py-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                  댓글을 불러오는 중...
                </div>
              ) : comments.length > 0 ? (
                <div className="space-y-4">
                  {comments.map((comment) => {
                    const isOwnComment = currentUserId && comment.userId === currentUserId;
                    const canEditComment = isOwnComment && comment.createdAt && canEditOrDelete(comment.createdAt);
                    const isEditingThisComment = editingCommentId === comment.id;

                    return (
                      <div key={comment.id} className="flex gap-3">
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

                            {/* ⋮ 메뉴 버튼 */}
                            {canEditComment && !isEditingThisComment && (
                              <div className="relative ml-auto">
                                <button
                                  ref={(el) => {
                                    if (el) {
                                      commentMenuButtonRefs.current.set(comment.id, el);
                                    } else {
                                      commentMenuButtonRefs.current.delete(comment.id);
                                    }
                                  }}
                                  onClick={() => {
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

                          {/* 댓글 내용 */}
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
                  })}
                </div>
              ) : (
                <div className="py-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                  아직 댓글이 없습니다
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ========================================
            댓글 입력창 (하단 고정)
            ======================================== */}
        {onAddComment && (
          <div className="flex-shrink-0 p-4 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="flex gap-3">
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
                className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 rounded-full text-sm
                           text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSubmitComment}
                disabled={!commentInput.trim() || isSubmittingComment}
                className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-full
                           hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmittingComment ? '...' : '게시'}
              </button>
            </div>
          </div>
        )}

        {/* 드롭다운 메뉴 */}
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
      </div>
    </div>,
    document.body
  );
}

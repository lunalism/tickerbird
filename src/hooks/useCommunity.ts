/**
 * 커뮤니티 훅
 *
 * 게시글 CRUD, 좋아요, 댓글 기능을 관리합니다.
 * Firebase Auth 연동을 위해 useAuth() 훅 사용
 */
import { useState, useCallback, useEffect } from 'react';
import {
  CommunityPost,
  CommunityComment,
  CommunityCategory,
  SortType,
  CreatePostRequest,
  CreateCommentRequest,
  CommunityApiResponse,
  PostsListResponse,
} from '@/types/community';
import { useAuth } from '@/components/providers/AuthProvider';

interface UseCommunityOptions {
  category?: CommunityCategory;
  sort?: SortType;
  autoFetch?: boolean;
}

interface CommentsListResponse {
  comments: CommunityComment[];
  hasMore: boolean;
  nextCursor?: string;
}

/**
 * 커뮤니티 게시글 관리 훅
 *
 * useAuth() 훅을 사용하여 Firebase Auth 사용자 정보를 가져옴
 * API 호출 시 x-user-id, x-user-name, x-user-photo 헤더에 사용자 정보 전달
 */
export function useCommunity(options: UseCommunityOptions = {}) {
  const { category = 'all', sort = 'latest', autoFetch = true } = options;

  // AuthProvider의 useAuth 훅으로 사용자 정보 가져오기
  // user: Firebase Auth User 객체 (uid 포함)
  // userProfile: 앱 내부 프로필 (nickname, avatarUrl 포함)
  const { user, userProfile } = useAuth();

  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>();

  /**
   * API 요청 시 사용할 인증 헤더 생성
   * Firebase Auth 사용자 정보를 헤더에 포함
   */
  const getAuthHeaders = useCallback((): HeadersInit => {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // 로그인된 사용자인 경우 헤더에 사용자 정보 추가
    if (user?.uid) {
      headers['x-user-id'] = user.uid;
    }
    if (userProfile?.nickname || userProfile?.displayName) {
      // 닉네임 우선, 없으면 displayName 사용
      const name = userProfile.nickname || userProfile.displayName;
      headers['x-user-name'] = encodeURIComponent(name);
    }
    if (userProfile?.avatarUrl) {
      headers['x-user-photo'] = encodeURIComponent(userProfile.avatarUrl);
    }

    return headers;
  }, [user, userProfile]);

  /**
   * 게시글 목록 조회
   *
   * 로그인 사용자인 경우 인증 헤더 포함 (좋아요 여부 확인용)
   */
  const fetchPosts = useCallback(async (reset: boolean = true) => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        category,
        sort,
        limit: '20',
      });

      if (!reset && nextCursor) {
        params.set('cursor', nextCursor);
      }

      // 인증 헤더 포함 (좋아요 여부 확인용)
      const response = await fetch(`/api/community/posts?${params}`, {
        headers: getAuthHeaders(),
      });
      const result: CommunityApiResponse<PostsListResponse> = await response.json();

      if (!result.success || !result.data) {
        throw new Error(result.error || '게시글을 불러오는데 실패했습니다.');
      }

      const { posts: newPosts, hasMore: more, nextCursor: cursor } = result.data;

      if (reset) {
        setPosts(newPosts);
      } else {
        setPosts(prev => [...prev, ...newPosts]);
      }

      setHasMore(more);
      setNextCursor(cursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [category, sort, nextCursor, getAuthHeaders]);

  /**
   * 더 많은 게시글 로드 (무한 스크롤)
   */
  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      fetchPosts(false);
    }
  }, [isLoading, hasMore, fetchPosts]);

  /**
   * 게시글 새로고침
   */
  const refetch = useCallback(() => {
    setNextCursor(undefined);
    fetchPosts(true);
  }, [fetchPosts]);

  /**
   * 새 게시글 작성
   *
   * getAuthHeaders()로 사용자 정보를 헤더에 포함하여 API 호출
   * 로그인되지 않은 경우 API에서 401 에러 반환
   *
   * @throws Error 게시글 작성 실패 시 에러 throw
   */
  const createPost = useCallback(async (data: CreatePostRequest): Promise<CommunityPost> => {
    // 인증 헤더 포함하여 API 호출
    const response = await fetch('/api/community/posts', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    const result: CommunityApiResponse<CommunityPost> = await response.json();

    if (!result.success || !result.data) {
      const errorMsg = result.error || '게시글 작성에 실패했습니다.';
      setError(errorMsg);
      throw new Error(errorMsg);
    }

    // 에러 상태 초기화
    setError(null);

    // 새 게시글을 목록 맨 앞에 추가
    setPosts(prev => [result.data!, ...prev]);

    return result.data;
  }, [getAuthHeaders]);

  /**
   * 게시글 삭제
   *
   * 인증 헤더 포함하여 API 호출 (본인 게시글만 삭제 가능)
   */
  const deletePost = useCallback(async (postId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/community/posts/${postId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      const result: CommunityApiResponse<{ deleted: boolean }> = await response.json();

      if (!result.success) {
        throw new Error(result.error || '게시글 삭제에 실패했습니다.');
      }

      // 목록에서 제거
      setPosts(prev => prev.filter(p => p.id !== postId));

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : '게시글 삭제에 실패했습니다.');
      return false;
    }
  }, [getAuthHeaders]);

  /**
   * 좋아요 토글
   *
   * 인증 헤더 포함하여 API 호출 (로그인 필요)
   */
  const toggleLike = useCallback(async (postId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/community/posts/${postId}/like`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      const result: CommunityApiResponse<{ liked: boolean; likesCount: number }> = await response.json();

      if (!result.success || !result.data) {
        throw new Error(result.error || '좋아요 처리에 실패했습니다.');
      }

      // 게시글 목록에서 좋아요 상태 업데이트
      setPosts(prev =>
        prev.map(post =>
          post.id === postId
            ? {
                ...post,
                isLiked: result.data!.liked,
                likesCount: result.data!.likesCount,
              }
            : post
        )
      );

      return result.data.liked;
    } catch (err) {
      setError(err instanceof Error ? err.message : '좋아요 처리에 실패했습니다.');
      return false;
    }
  }, [getAuthHeaders]);

  /**
   * 카테고리나 정렬이 변경되면 다시 로드
   *
   * fetchPosts를 의존성 배열에 포함하지 않는 이유:
   * - fetchPosts는 nextCursor에 의존하므로 매 렌더링마다 새로 생성됨
   * - 이 useEffect는 category/sort 변경 시에만 reset=true로 호출해야 함
   * - reset=true일 때 nextCursor는 사용되지 않으므로 의존성 불필요
   */
  useEffect(() => {
    if (autoFetch) {
      setNextCursor(undefined);
      fetchPosts(true);
    }
  // fetchPosts는 nextCursor 의존성으로 인해 안정적이지 않음 - 의도적 제외
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, sort, autoFetch]);

  return {
    posts,
    isLoading,
    error,
    hasMore,
    fetchPosts,
    loadMore,
    refetch,
    createPost,
    deletePost,
    toggleLike,
  };
}

/**
 * 게시글 댓글 관리 훅
 *
 * useAuth() 훅을 사용하여 Firebase Auth 사용자 정보를 가져옴
 * 댓글 작성 시 인증 헤더 포함
 */
export function useComments(postId: string) {
  // AuthProvider의 useAuth 훅으로 사용자 정보 가져오기
  const { user, userProfile } = useAuth();

  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>();

  /**
   * API 요청 시 사용할 인증 헤더 생성
   */
  const getAuthHeaders = useCallback((): HeadersInit => {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (user?.uid) {
      headers['x-user-id'] = user.uid;
    }
    if (userProfile?.nickname || userProfile?.displayName) {
      const name = userProfile.nickname || userProfile.displayName;
      headers['x-user-name'] = encodeURIComponent(name);
    }
    if (userProfile?.avatarUrl) {
      headers['x-user-photo'] = encodeURIComponent(userProfile.avatarUrl);
    }

    return headers;
  }, [user, userProfile]);

  /**
   * 댓글 목록 조회
   */
  const fetchComments = useCallback(async (reset: boolean = true) => {
    if (!postId) return;

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ limit: '20' });

      if (!reset && nextCursor) {
        params.set('cursor', nextCursor);
      }

      const response = await fetch(`/api/community/posts/${postId}/comments?${params}`);
      const result: CommunityApiResponse<CommentsListResponse> = await response.json();

      if (!result.success || !result.data) {
        throw new Error(result.error || '댓글을 불러오는데 실패했습니다.');
      }

      const { comments: newComments, hasMore: more, nextCursor: cursor } = result.data;

      if (reset) {
        setComments(newComments);
      } else {
        setComments(prev => [...prev, ...newComments]);
      }

      setHasMore(more);
      setNextCursor(cursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [postId, nextCursor]);

  /**
   * 더 많은 댓글 로드
   */
  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      fetchComments(false);
    }
  }, [isLoading, hasMore, fetchComments]);

  /**
   * 새 댓글 작성
   *
   * 인증 헤더 포함하여 API 호출 (로그인 필요)
   */
  const createComment = useCallback(async (data: CreateCommentRequest): Promise<CommunityComment | null> => {
    if (!postId) return null;

    try {
      // 인증 헤더 포함하여 API 호출
      const response = await fetch(`/api/community/posts/${postId}/comments`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });

      const result: CommunityApiResponse<CommunityComment> = await response.json();

      if (!result.success || !result.data) {
        throw new Error(result.error || '댓글 작성에 실패했습니다.');
      }

      // 새 댓글을 목록 끝에 추가
      setComments(prev => [...prev, result.data!]);

      return result.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : '댓글 작성에 실패했습니다.');
      return null;
    }
  }, [postId, getAuthHeaders]);

  /**
   * postId가 변경되면 댓글 다시 로드
   *
   * fetchComments를 의존성 배열에 포함하지 않는 이유:
   * - fetchComments는 nextCursor에 의존하므로 매 렌더링마다 새로 생성됨
   * - 이 useEffect는 postId 변경 시에만 reset=true로 호출해야 함
   * - reset=true일 때 nextCursor는 사용되지 않으므로 의존성 불필요
   */
  useEffect(() => {
    if (postId) {
      setNextCursor(undefined);
      fetchComments(true);
    }
  // fetchComments는 nextCursor 의존성으로 인해 안정적이지 않음 - 의도적 제외
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  return {
    comments,
    isLoading,
    error,
    hasMore,
    fetchComments,
    loadMore,
    createComment,
  };
}

// 내 정보 페이지 클라이언트 컴포넌트
// 프로필 정보, 활동 통계, 구독 등급, 연결된 계정, 계정 설정(로그아웃/탈퇴)을 제공합니다.

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  LogOut,
  Pencil,
  Check,
  X,
  Loader2,
  Star,
  FileText,
  MessageSquare,
  Crown,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";

// 프로필 테이블 데이터 타입
interface Profile {
  display_name: string | null;
  avatar_url: string | null;
  tier: string;
  created_at: string;
}

// 활동 통계 타입
interface ActivityStats {
  watchlistCount: number;
  postsCount: number;
  commentsCount: number;
}

export default function ProfilePageClient() {
  const router = useRouter();
  // Supabase 인증 상태
  const { user, isLoading: isAuthLoading, isLoggedIn } = useAuth();

  // 프로필 데이터 상태
  const [profile, setProfile] = useState<Profile | null>(null);
  // 프로필 로딩 상태
  const [isProfileLoading, setIsProfileLoading] = useState(true);

  // 활동 통계 상태
  const [stats, setStats] = useState<ActivityStats>({
    watchlistCount: 0,
    postsCount: 0,
    commentsCount: 0,
  });

  // 닉네임 편집 상태
  const [isEditingName, setIsEditingName] = useState(false);
  // 편집 중인 닉네임 값
  const [editName, setEditName] = useState("");
  // 닉네임 저장 중 상태
  const [isSaving, setIsSaving] = useState(false);
  // 로그아웃 처리 중 상태
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  // 토스트 메시지 상태
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  // 아바타 이미지 로드 실패 상태
  const [avatarError, setAvatarError] = useState(false);
  // 닉네임 유효성 검사 에러 메시지
  const [nameError, setNameError] = useState("");
  // 닉네임 중복 체크 상태
  const [dupStatus, setDupStatus] = useState<
    "idle" | "checking" | "available" | "duplicate"
  >("idle");
  // debounce 타이머 ref
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 탈퇴 확인 모달 표시 상태
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  // 탈퇴 처리 중 상태
  const [isDeleting, setIsDeleting] = useState(false);

  // 비로그인 시 /login으로 리다이렉트
  useEffect(() => {
    if (!isAuthLoading && !isLoggedIn) {
      router.replace("/login");
    }
  }, [isAuthLoading, isLoggedIn, router]);

  // 프로필 데이터 및 활동 통계를 Supabase에서 가져옵니다
  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      const supabase = createClient();

      // 프로필 데이터 조회
      const { data: profileData } = await supabase
        .from("profiles")
        .select("display_name, avatar_url, tier, created_at")
        .eq("id", user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
      } else {
        // profiles 테이블에 데이터가 없으면 auth 메타데이터로 대체
        setProfile({
          display_name:
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            null,
          avatar_url: user.user_metadata?.avatar_url || null,
          tier: "free",
          created_at: user.created_at,
        });
      }

      // 활동 통계 조회 (각 테이블에서 COUNT, 테이블 없어도 에러 무시)
      const [watchlistRes, postsRes, commentsRes] = await Promise.all([
        supabase
          .from("watchlist")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
        supabase
          .from("posts")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
        supabase
          .from("comments")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
      ]);

      setStats({
        watchlistCount: watchlistRes.count ?? 0,
        postsCount: postsRes.count ?? 0,
        commentsCount: commentsRes.count ?? 0,
      });

      setIsProfileLoading(false);
    };

    fetchData();
  }, [user]);

  // 표시용 이름 (프로필 > 메타데이터 > 이메일 순서로 fallback)
  const displayName =
    profile?.display_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "사용자";

  // 표시용 아바타 URL (avatar_url > picture > 빈 문자열 순으로 fallback)
  const avatarUrl =
    profile?.avatar_url ||
    user?.user_metadata?.avatar_url ||
    user?.user_metadata?.picture ||
    "";

  // 구독 등급
  const tier = profile?.tier || "free";
  const tierLabel = tier === "premium" ? "Premium" : "Free";
  const isPremium = tier === "premium";

  // 가입일 포맷
  const createdAt = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  // 마지막 로그인 시간 포맷
  const lastSignIn = user?.last_sign_in_at
    ? new Date(user.last_sign_in_at).toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  // 토스트 메시지 표시 (3초 후 자동 사라짐)
  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // 닉네임 허용 패턴 (한글, 영문, 숫자, 언더스코어만)
  const NAME_PATTERN = /^[가-힣a-zA-Z0-9_]+$/;

  // 닉네임 유효성 검사 (실시간)
  const validateName = (value: string): string => {
    const trimmed = value.trim();
    if (!trimmed) return "닉네임을 입력해주세요";
    if (trimmed.length < 2) return "닉네임은 2글자 이상이어야 합니다";
    if (trimmed.length > 16) return "닉네임은 16글자 이하여야 합니다";
    if (!NAME_PATTERN.test(trimmed))
      return "한글, 영문, 숫자, _ 만 사용할 수 있습니다";
    return "";
  };

  // 저장 버튼 활성화 여부 (에러 없고, 현재 닉네임과 다르고, 중복 아닐 때)
  const isNameValid =
    !nameError &&
    editName.trim() !== "" &&
    editName.trim() !== displayName &&
    dupStatus === "available";

  // Supabase에서 닉네임 중복 여부를 확인합니다 (본인 제외)
  const checkDuplicate = useCallback(
    async (name: string) => {
      if (!user) return;
      setDupStatus("checking");

      const supabase = createClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("id")
        .eq("display_name", name)
        .neq("id", user.id)
        .limit(1);

      if (error) {
        console.error("닉네임 중복 체크 실패:", error);
        setDupStatus("available");
        return;
      }

      setDupStatus(data && data.length > 0 ? "duplicate" : "available");
    },
    [user]
  );

  // 닉네임 입력값 변경 핸들러 (실시간 유효성 검사 + debounce 중복 체크)
  const handleNameChange = (value: string) => {
    setEditName(value);
    const error = validateName(value);
    setNameError(error);

    // 기존 debounce 타이머 해제
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // 유효성 검사 통과 + 현재 닉네임과 다를 때만 중복 체크
    const trimmed = value.trim();
    if (!error && trimmed && trimmed !== displayName) {
      setDupStatus("checking");
      debounceRef.current = setTimeout(() => {
        checkDuplicate(trimmed);
      }, 500);
    } else {
      setDupStatus("idle");
    }
  };

  // 컴포넌트 언마운트 시 debounce 타이머 정리
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // 닉네임 편집 시작
  const handleEditStart = () => {
    setEditName(displayName);
    setNameError("");
    setDupStatus("idle");
    setIsEditingName(true);
  };

  // 닉네임 저장
  const handleEditSave = async () => {
    if (!user || !isNameValid) return;
    setIsSaving(true);

    const trimmedName = editName.trim();
    const supabase = createClient();

    // 1단계: Supabase Auth user_metadata에 닉네임 저장
    const { error: authError } = await supabase.auth.updateUser({
      data: { full_name: trimmedName, name: trimmedName },
    });

    if (authError) {
      console.error("닉네임 auth 메타데이터 업데이트 실패:", authError);
      showToast("닉네임 변경에 실패했습니다", "error");
      setIsSaving(false);
      setIsEditingName(false);
      return;
    }

    // 2단계: profiles 테이블에도 저장
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert(
        { id: user.id, display_name: trimmedName },
        { onConflict: "id" }
      );

    if (profileError) {
      console.error("닉네임 profiles 테이블 저장 실패:", profileError);
    }

    // 로컬 상태 업데이트 + 성공 토스트
    setProfile((prev) =>
      prev ? { ...prev, display_name: trimmedName } : prev
    );
    showToast("닉네임이 변경되었습니다", "success");

    setIsSaving(false);
    setIsEditingName(false);
  };

  // 닉네임 편집 취소
  const handleEditCancel = () => {
    setIsEditingName(false);
    setEditName("");
  };

  // 로그아웃 처리
  const handleLogout = async () => {
    setIsLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
  };

  // 계정 탈퇴 처리
  const handleDeleteAccount = async () => {
    if (!user) return;
    setIsDeleting(true);

    try {
      // Supabase Edge Function 또는 서버 API를 통해 계정 삭제
      // 클라이언트에서 직접 admin.deleteUser()는 호출 불가하므로
      // 서버 API Route를 통해 처리합니다
      const response = await fetch("/api/account/delete", {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("계정 삭제 API 호출 실패");
      }

      // 성공 시 로그아웃 후 로그인 페이지로 이동
      const supabase = createClient();
      await supabase.auth.signOut();
      router.replace("/login");
    } catch (error) {
      console.error("계정 탈퇴 실패:", error);
      showToast("계정 탈퇴 중 오류가 발생했습니다", "error");
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  // 로딩 중 스피너 표시
  if (isAuthLoading || isProfileLoading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 size={32} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  // 비로그인 상태 (리다이렉트 전 잠깐 표시)
  if (!isLoggedIn) {
    return null;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="mb-8 text-xl font-bold text-foreground">내 정보</h1>

      {/* ── 1. 프로필 섹션 ── */}
      <section className="mb-6 rounded-lg border border-border bg-card p-6">
        <div className="flex items-start gap-5">
          {/* 아바타 이미지 (Google 프로필 사진, 실패 시 이니셜 폴백) */}
          {avatarUrl && !avatarError ? (
            <Image
              src={avatarUrl}
              alt={displayName}
              width={72}
              height={72}
              className="h-[72px] w-[72px] shrink-0 rounded-full object-cover"
              onError={() => setAvatarError(true)}
            />
          ) : (
            <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full bg-accent text-2xl font-bold text-accent-foreground">
              {displayName.charAt(0)}
            </div>
          )}

          {/* 프로필 정보 */}
          <div className="flex-1 space-y-3">
            {/* 닉네임 (인라인 편집) */}
            <div className="flex items-center gap-2">
              {isEditingName ? (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => handleNameChange(e.target.value)}
                      maxLength={17}
                      className={`rounded-md border bg-background px-2 py-1 text-lg font-semibold text-foreground outline-none focus:ring-2 ${
                        nameError
                          ? "border-red-500 focus:ring-red-300"
                          : "border-border focus:ring-ring"
                      }`}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && isNameValid) handleEditSave();
                        if (e.key === "Escape") handleEditCancel();
                      }}
                    />
                    <button
                      onClick={handleEditSave}
                      disabled={isSaving || !isNameValid}
                      className="rounded-md p-1 text-emerald-600 hover:bg-emerald-50 disabled:opacity-40 disabled:cursor-not-allowed dark:hover:bg-emerald-950/30"
                      aria-label="저장"
                    >
                      {isSaving ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Check size={16} />
                      )}
                    </button>
                    <button
                      onClick={handleEditCancel}
                      className="rounded-md p-1 text-muted-foreground hover:bg-accent"
                      aria-label="취소"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  {nameError && (
                    <p className="text-xs text-red-500">{nameError}</p>
                  )}
                  {!nameError && dupStatus === "checking" && (
                    <p className="text-xs text-muted-foreground">확인 중...</p>
                  )}
                  {!nameError && dupStatus === "duplicate" && (
                    <p className="text-xs text-red-500">
                      이미 사용 중인 닉네임입니다
                    </p>
                  )}
                  {!nameError &&
                    dupStatus === "available" &&
                    editName.trim() !== displayName && (
                      <p className="text-xs text-emerald-600">
                        사용 가능한 닉네임입니다
                      </p>
                    )}
                </div>
              ) : (
                <>
                  <h2 className="text-lg font-semibold text-foreground">
                    {displayName}
                  </h2>
                  <button
                    onClick={handleEditStart}
                    className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                    aria-label="닉네임 수정"
                  >
                    <Pencil size={14} />
                  </button>
                </>
              )}
            </div>

            {/* 이메일 */}
            <p className="text-sm text-muted-foreground">{user?.email}</p>

            {/* 가입일 + 구독 등급 */}
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="text-muted-foreground">가입일: {createdAt}</span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  isPremium
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                }`}
              >
                {tierLabel}
              </span>
            </div>

            {/* 마지막 로그인 시간 */}
            {lastSignIn && (
              <p className="text-xs text-muted-foreground">
                마지막 로그인: {lastSignIn}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ── 2. 활동 통계 섹션 ── */}
      <section className="mb-6">
        <h3 className="mb-3 text-sm font-semibold text-foreground">
          활동 통계
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {/* 관심종목 수 */}
          <div className="flex flex-col items-center gap-1 rounded-lg border border-border bg-card p-4">
            <Star size={20} className="text-amber-500" />
            <span className="text-2xl font-bold text-foreground">
              {stats.watchlistCount}
            </span>
            <span className="text-xs text-muted-foreground">관심종목</span>
          </div>
          {/* 게시글 수 */}
          <div className="flex flex-col items-center gap-1 rounded-lg border border-border bg-card p-4">
            <FileText size={20} className="text-sky-500" />
            <span className="text-2xl font-bold text-foreground">
              {stats.postsCount}
            </span>
            <span className="text-xs text-muted-foreground">게시글</span>
          </div>
          {/* 댓글 수 */}
          <div className="flex flex-col items-center gap-1 rounded-lg border border-border bg-card p-4">
            <MessageSquare size={20} className="text-emerald-500" />
            <span className="text-2xl font-bold text-foreground">
              {stats.commentsCount}
            </span>
            <span className="text-xs text-muted-foreground">댓글</span>
          </div>
        </div>
      </section>

      {/* ── 3. 구독 등급 섹션 ── */}
      <section className="mb-6 rounded-lg border border-border bg-card p-6">
        <h3 className="mb-3 text-sm font-semibold text-foreground">
          구독 등급
        </h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown
              size={20}
              className={isPremium ? "text-amber-500" : "text-gray-400"}
            />
            <span className="text-sm font-medium text-foreground">
              {isPremium ? "Premium 구독 중" : "Free 플랜"}
            </span>
          </div>
          {/* Free 유저에게만 업그레이드 버튼 표시 */}
          {!isPremium && (
            <button
              onClick={() => showToast("준비 중입니다", "error")}
              className="rounded-md bg-amber-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-amber-600"
            >
              프리미엄으로 업그레이드
            </button>
          )}
        </div>
      </section>

      {/* ── 4. 연결된 계정 섹션 ── */}
      <section className="mb-6 rounded-lg border border-border bg-card p-6">
        <h3 className="mb-3 text-sm font-semibold text-foreground">
          연결된 계정
        </h3>
        <div className="flex items-center gap-3">
          {/* Google 아이콘 */}
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          <div>
            <p className="text-sm font-medium text-foreground">
              Google로 연결됨
            </p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </div>
      </section>

      {/* ── 5. 계정 설정 섹션 (로그아웃 + 탈퇴) ── */}
      <section className="rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold text-foreground">
          계정 설정
        </h3>
        <div className="space-y-2">
          {/* 로그아웃 버튼 */}
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950/30"
          >
            {isLoggingOut ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <LogOut size={16} />
            )}
            <span>{isLoggingOut ? "로그아웃 중..." : "로그아웃"}</span>
          </button>

          {/* 계정 탈퇴 버튼 */}
          <button
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-red-600/70 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-red-400/70 dark:hover:bg-red-950/30 dark:hover:text-red-400"
          >
            <Trash2 size={16} />
            <span>계정 탈퇴</span>
          </button>
        </div>
      </section>

      {/* ── 계정 탈퇴 확인 모달 ── */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-sm rounded-lg bg-card p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-semibold text-foreground">
              계정 탈퇴
            </h3>
            <p className="mb-6 text-sm text-muted-foreground">
              정말 탈퇴하시겠습니까? 모든 데이터가 삭제되며 복구할 수 없습니다.
            </p>
            <div className="flex justify-end gap-2">
              {/* 취소 버튼 */}
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent"
              >
                취소
              </button>
              {/* 탈퇴 확인 버튼 */}
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting && (
                  <Loader2 size={14} className="animate-spin" />
                )}
                <span>{isDeleting ? "처리 중..." : "탈퇴하기"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 토스트 알림 ── */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 rounded-lg px-4 py-3 text-sm font-medium shadow-lg transition-all ${
            toast.type === "success"
              ? "bg-emerald-600 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}

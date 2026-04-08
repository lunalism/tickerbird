// 관리자 사용자 관리 페이지 클라이언트 컴포넌트
// 유저 목록 조회, 검색, 등급 변경 기능을 제공합니다.

"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

// 유저 데이터 타입
interface AdminUser {
  id: string;
  display_name: string | null;
  email: string;
  avatar_url: string | null;
  is_admin: boolean;
  tier: string;
  created_at: string;
}

export default function UsersPageClient() {
  const router = useRouter();
  const { isLoading: isAuthLoading, isLoggedIn, isAdmin } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  // 등급 변경 중인 유저 ID
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const perPage = 20;

  // 비관리자 리다이렉트
  useEffect(() => {
    if (!isAuthLoading && (!isLoggedIn || !isAdmin)) {
      router.replace("/news");
    }
  }, [isAuthLoading, isLoggedIn, isAdmin, router]);

  // 유저 목록 조회
  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        ...(search && { search }),
      });
      const res = await fetch(`/api/admin/users?${params}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
        setTotal(data.total);
      }
    } catch (error) {
      console.error("유저 목록 조회 실패:", error);
    } finally {
      setIsLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    if (!isAdmin) return;
    fetchUsers();
  }, [isAdmin, fetchUsers]);

  // 검색 실행
  const handleSearch = () => {
    setPage(1);
    setSearch(searchInput);
  };

  // 등급 변경
  const handleTierChange = async (userId: string, newTier: string) => {
    setUpdatingId(userId);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, tier: newTier }),
      });

      if (res.ok) {
        // 로컬 상태 즉시 반영
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, tier: newTier } : u))
        );
      }
    } catch (error) {
      console.error("등급 변경 실패:", error);
    } finally {
      setUpdatingId(null);
    }
  };

  // 날짜 포맷
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const totalPages = Math.ceil(total / perPage);

  if (isAuthLoading || !isAdmin) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 size={32} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {/* 뒤로가기 + 제목 */}
      <div className="mb-6">
        <Link
          href="/admin"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft size={16} />
          관리자 패널
        </Link>
        <h1 className="text-xl font-bold text-foreground">👥 사용자 관리</h1>
      </div>

      {/* 검색창 */}
      <div className="mb-6 flex gap-2">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            placeholder="닉네임 또는 이메일 검색..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground/30 focus:outline-none"
          />
        </div>
        <button
          onClick={handleSearch}
          className="shrink-0 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
        >
          검색
        </button>
      </div>

      {/* 유저 목록 */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={24} className="animate-spin text-muted-foreground" />
        </div>
      ) : users.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          검색 결과가 없습니다.
        </p>
      ) : (
        <>
          {/* 테이블 (모바일에서는 카드로 전환) */}
          <div className="space-y-2">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 sm:p-4"
              >
                {/* 아바타 */}
                <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-muted">
                  {user.avatar_url ? (
                    <Image
                      src={user.avatar_url}
                      alt={`${user.display_name || "사용자"} 프로필 사진`}
                      width={36}
                      height={36}
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs font-medium text-muted-foreground">
                      {(user.display_name || "?")[0]}
                    </div>
                  )}
                </div>

                {/* 정보 */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-foreground">
                      {user.display_name || "이름 없음"}
                    </p>
                    {/* 등급 배지 */}
                    <span
                      className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                        user.tier === "premium"
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                          : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                      }`}
                    >
                      {user.tier === "premium" ? "Premium" : "Free"}
                    </span>
                    {user.is_admin && (
                      <span className="shrink-0 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                        Admin
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {user.email} · {formatDate(user.created_at)}
                  </p>
                </div>

                {/* 액션 버튼 */}
                <button
                  onClick={() =>
                    handleTierChange(
                      user.id,
                      user.tier === "premium" ? "free" : "premium"
                    )
                  }
                  disabled={updatingId === user.id}
                  className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                    user.tier === "premium"
                      ? "border border-border text-muted-foreground hover:bg-accent"
                      : "bg-amber-500 text-white hover:bg-amber-600"
                  }`}
                >
                  {updatingId === user.id ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : user.tier === "premium" ? (
                    "Free 해제"
                  ) : (
                    "Premium 승급"
                  )}
                </button>
              </div>
            ))}
          </div>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent disabled:opacity-30"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm text-muted-foreground">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent disabled:opacity-30"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

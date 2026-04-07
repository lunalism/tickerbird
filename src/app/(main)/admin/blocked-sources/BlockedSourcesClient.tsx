// 차단 언론사 관리 클라이언트 컴포넌트
// admin_settings에서 차단 언론사 목록을 조회/추가/삭제합니다.

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, X, Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function BlockedSourcesClient() {
  const router = useRouter();
  const { isLoading: isAuthLoading, isLoggedIn, isAdmin } = useAuth();

  // 차단 언론사 목록
  const [sources, setSources] = useState<string[]>([]);
  // 입력값
  const [inputValue, setInputValue] = useState("");
  // 로딩 상태
  const [isDataLoading, setIsDataLoading] = useState(true);
  // 저장 중 상태
  const [isSaving, setIsSaving] = useState(false);
  // 에러 메시지
  const [error, setError] = useState<string | null>(null);

  // 비관리자 리다이렉트
  useEffect(() => {
    if (!isAuthLoading && (!isLoggedIn || !isAdmin)) {
      router.replace("/news");
    }
  }, [isAuthLoading, isLoggedIn, isAdmin, router]);

  // 차단 목록 조회
  useEffect(() => {
    if (!isAuthLoading && isAdmin) {
      fetchSources();
    }
  }, [isAuthLoading, isAdmin]);

  const fetchSources = async () => {
    setIsDataLoading(true);
    try {
      const res = await fetch("/api/admin/blocked-sources");
      const data = await res.json();
      setSources(data.sources ?? []);
    } catch {
      setError("차단 목록 조회 실패");
    } finally {
      setIsDataLoading(false);
    }
  };

  // 차단 목록 업데이트
  const updateSources = async (newSources: string[]) => {
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/blocked-sources", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sources: newSources }),
      });

      if (!res.ok) throw new Error("저장 실패");

      setSources(newSources);
    } catch {
      setError("저장 중 오류가 발생했습니다");
    } finally {
      setIsSaving(false);
    }
  };

  // 언론사 추가
  const handleAdd = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    if (sources.includes(trimmed)) {
      setError("이미 등록된 언론사입니다");
      return;
    }
    setError(null);
    updateSources([...sources, trimmed]);
    setInputValue("");
  };

  // 언론사 삭제
  const handleRemove = (source: string) => {
    updateSources(sources.filter((s) => s !== source));
  };

  // Enter 키로 추가
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleAdd();
  };

  // 로딩 중
  if (isAuthLoading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 size={32} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      {/* 뒤로가기 */}
      <button
        onClick={() => router.push("/admin")}
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft size={16} />
        관리자 패널로
      </button>

      {/* 제목 */}
      <h1 className="mb-8 text-xl font-bold text-foreground">
        🚫 차단 언론사 관리
      </h1>

      {/* 안내 텍스트 */}
      <div className="mb-6 rounded-lg border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">
          차단된 언론사의 뉴스는 다음 수집 시부터 제외됩니다.
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          언론사명은 네이버 뉴스에 표시되는 정확한 이름을 입력하세요.
        </p>
      </div>

      {/* 언론사 추가 입력 */}
      <div className="mb-6 flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="언론사명 입력"
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground/30 focus:outline-none"
        />
        <button
          onClick={handleAdd}
          disabled={isSaving || !inputValue.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/90 disabled:opacity-50"
        >
          <Plus size={14} />
          추가
        </button>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <p className="mb-4 text-sm text-red-500 dark:text-red-400">{error}</p>
      )}

      {/* 현재 차단 목록 */}
      <div>
        <h2 className="mb-3 text-sm font-bold text-foreground">
          현재 차단 목록 ({sources.length}개)
        </h2>

        {isDataLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2
              size={20}
              className="animate-spin text-muted-foreground"
            />
          </div>
        ) : sources.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            차단된 언론사가 없습니다.
          </p>
        ) : (
          <div className="divide-y divide-border rounded-lg border border-border">
            {sources.map((source) => (
              <div
                key={source}
                className="flex items-center justify-between px-4 py-3"
              >
                <span className="text-sm font-medium text-foreground">
                  {source}
                </span>
                <button
                  onClick={() => handleRemove(source)}
                  disabled={isSaving}
                  className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-red-100 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                  aria-label={`${source} 삭제`}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

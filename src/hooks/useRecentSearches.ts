/**
 * 최근 검색어 관리 훅
 *
 * localStorage를 사용하여 최근 검색어를 저장하고 관리합니다.
 * 검색 시 Firestore에 로그를 저장하여 인기 검색어 집계에 활용합니다.
 *
 * 기능:
 * - 검색어 추가 (중복 시 최상단으로 이동)
 * - 개별 검색어 삭제
 * - 전체 검색어 삭제
 * - 최대 10개 저장 (오래된 것 자동 삭제)
 * - Firestore 검색 로그 저장 (인기 검색어용)
 *
 * 사용법:
 * const { recentSearches, addSearch, removeSearch, clearAll } = useRecentSearches();
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { logSearch } from "@/lib/searchLog";

// localStorage 키 상수
const STORAGE_KEY = "recentSearches";

// 최대 저장 개수
const MAX_SEARCHES = 10;

/**
 * 최근 검색어 관리 훅
 *
 * @returns {Object} 최근 검색어 관련 상태 및 함수들
 * @property {string[]} recentSearches - 최근 검색어 배열 (최신순)
 * @property {function} addSearch - 검색어 추가 함수
 * @property {function} removeSearch - 특정 검색어 삭제 함수
 * @property {function} clearAll - 전체 검색어 삭제 함수
 */
export function useRecentSearches() {
  // 최근 검색어 상태
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // 컴포넌트 마운트 여부 (SSR 대응)
  const [isMounted, setIsMounted] = useState(false);

  /**
   * 컴포넌트 마운트 시 localStorage에서 검색어 불러오기
   * SSR 환경에서는 localStorage 접근 불가하므로 클라이언트에서만 실행
   */
  useEffect(() => {
    setIsMounted(true);

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // 배열인지 확인하고, 문자열 배열로 변환
        if (Array.isArray(parsed)) {
          setRecentSearches(parsed.filter((item): item is string => typeof item === "string"));
        }
      }
    } catch (error) {
      // localStorage 접근 실패 또는 JSON 파싱 실패 시 무시
      console.warn("최근 검색어 로드 실패:", error);
    }
  }, []);

  /**
   * localStorage에 검색어 배열 저장
   *
   * @param {string[]} searches - 저장할 검색어 배열
   */
  const saveToStorage = useCallback((searches: string[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(searches));
    } catch (error) {
      // localStorage 저장 실패 시 무시 (용량 초과 등)
      console.warn("최근 검색어 저장 실패:", error);
    }
  }, []);

  /**
   * 검색어 추가
   * - 빈 문자열은 무시
   * - 이미 존재하는 검색어는 최상단으로 이동
   * - 최대 개수(10개) 초과 시 가장 오래된 검색어 삭제
   * - Firestore에 검색 로그 저장 (인기 검색어 집계용)
   *
   * @param {string} query - 추가할 검색어
   */
  const addSearch = useCallback((query: string) => {
    const trimmed = query.trim();

    // 빈 문자열은 무시
    if (!trimmed) return;

    // Firestore에 검색 로그 저장 (비동기, 에러 무시)
    logSearch(trimmed, 'all').catch(() => {
      // 로그 저장 실패해도 검색 기능에는 영향 없음
    });

    setRecentSearches((prev) => {
      // 기존 검색어 제거 (중복 방지 및 최신으로 이동)
      const filtered = prev.filter(
        (item) => item.toLowerCase() !== trimmed.toLowerCase()
      );

      // 새 검색어를 맨 앞에 추가
      const updated = [trimmed, ...filtered];

      // 최대 개수 제한
      const limited = updated.slice(0, MAX_SEARCHES);

      // localStorage에 저장
      saveToStorage(limited);

      return limited;
    });
  }, [saveToStorage]);

  /**
   * 특정 검색어 삭제
   *
   * @param {string} query - 삭제할 검색어
   */
  const removeSearch = useCallback((query: string) => {
    setRecentSearches((prev) => {
      // 해당 검색어 필터링
      const filtered = prev.filter(
        (item) => item.toLowerCase() !== query.toLowerCase()
      );

      // localStorage에 저장
      saveToStorage(filtered);

      return filtered;
    });
  }, [saveToStorage]);

  /**
   * 전체 검색어 삭제
   */
  const clearAll = useCallback(() => {
    setRecentSearches([]);

    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn("최근 검색어 삭제 실패:", error);
    }
  }, []);

  return {
    // 상태
    recentSearches,
    isMounted,

    // 함수
    addSearch,
    removeSearch,
    clearAll,
  };
}

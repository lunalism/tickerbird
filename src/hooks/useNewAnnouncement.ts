/**
 * 새 공지사항 확인 훅
 *
 * 사용자가 마지막으로 공지사항을 확인한 이후 새 공지가 있는지 체크합니다.
 * localStorage에 마지막 확인 시간을 저장하여 페이지 새로고침 후에도 유지됩니다.
 *
 * ============================================================
 * 사용 방법:
 * ============================================================
 * const { hasNewAnnouncement, markAsRead } = useNewAnnouncement();
 *
 * // 배지 표시
 * {hasNewAnnouncement && <span className="badge">N</span>}
 *
 * // 공지사항 페이지 방문 시 호출
 * markAsRead();
 *
 * ============================================================
 * 동작 방식:
 * ============================================================
 * 1. Firestore에서 최신 발행된 공지사항의 createdAt 조회
 * 2. localStorage의 'lastAnnouncementCheck' 값과 비교
 * 3. 최신 공지가 더 최신이면 hasNewAnnouncement = true
 * 4. markAsRead() 호출 시 현재 시간을 localStorage에 저장
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  announcementsCollection,
  queryCollection,
  where,
  orderBy,
  limit,
} from '@/lib/firestore';
import type { Announcement } from '@/types/admin';

// ==================== 상수 ====================

/** localStorage 키 */
const STORAGE_KEY = 'lastAnnouncementCheck';

// ==================== 타입 ====================

interface UseNewAnnouncementReturn {
  /** 새 공지사항 여부 */
  hasNewAnnouncement: boolean;
  /** 로딩 상태 */
  isLoading: boolean;
  /** 공지사항 확인 완료 처리 (공지 페이지 방문 시 호출) */
  markAsRead: () => void;
  /** 최신 공지 날짜 (디버깅용) */
  latestAnnouncementDate: Date | null;
}

// ==================== 훅 구현 ====================

/**
 * 새 공지사항 확인 훅
 *
 * @returns hasNewAnnouncement, markAsRead, isLoading
 */
export function useNewAnnouncement(): UseNewAnnouncementReturn {
  // 상태
  const [hasNewAnnouncement, setHasNewAnnouncement] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [latestAnnouncementDate, setLatestAnnouncementDate] = useState<Date | null>(null);

  /**
   * localStorage에서 마지막 확인 시간 가져오기
   */
  const getLastCheckTime = useCallback((): number => {
    if (typeof window === 'undefined') return 0;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? parseInt(stored, 10) : 0;
    } catch {
      return 0;
    }
  }, []);

  /**
   * 공지사항 확인 완료 처리
   * 공지사항 페이지 방문 시 호출하여 배지를 숨깁니다.
   */
  const markAsRead = useCallback(() => {
    if (typeof window === 'undefined') return;

    try {
      const now = Date.now();
      localStorage.setItem(STORAGE_KEY, now.toString());
      setHasNewAnnouncement(false);
      console.log('[useNewAnnouncement] 공지 확인 완료:', new Date(now).toLocaleString('ko-KR'));
    } catch (err) {
      console.error('[useNewAnnouncement] localStorage 저장 실패:', err);
    }
  }, []);

  /**
   * 최신 공지사항 확인
   */
  useEffect(() => {
    const checkNewAnnouncement = async () => {
      try {
        setIsLoading(true);

        // 최신 발행된 공지사항 1개 조회
        const constraints = [
          where('isPublished', '==', true),
          orderBy('createdAt', 'desc'),
          limit(1),
        ];

        const announcements = await queryCollection<Omit<Announcement, 'id'>>(
          announcementsCollection(),
          constraints
        );

        if (announcements.length === 0) {
          // 공지사항 없음
          setHasNewAnnouncement(false);
          setLatestAnnouncementDate(null);
          return;
        }

        // 최신 공지의 생성 시간
        const latestAnnouncement = announcements[0];
        const latestDate = latestAnnouncement.createdAt?.toDate?.()
          || new Date(latestAnnouncement.createdAt as unknown as string);

        setLatestAnnouncementDate(latestDate);

        // 마지막 확인 시간과 비교
        const lastCheckTime = getLastCheckTime();
        const latestTime = latestDate.getTime();

        // 최신 공지가 마지막 확인 이후인지 체크
        const isNew = latestTime > lastCheckTime;
        setHasNewAnnouncement(isNew);

        console.log('[useNewAnnouncement] 체크 결과:', {
          latestAnnouncement: latestDate.toLocaleString('ko-KR'),
          lastCheck: lastCheckTime > 0 ? new Date(lastCheckTime).toLocaleString('ko-KR') : '없음',
          isNew,
        });
      } catch (err) {
        console.error('[useNewAnnouncement] 확인 실패:', err);
        setHasNewAnnouncement(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkNewAnnouncement();
  }, [getLastCheckTime]);

  return {
    hasNewAnnouncement,
    isLoading,
    markAsRead,
    latestAnnouncementDate,
  };
}

/**
 * 관리자 페이지 관련 타입 정의
 * - 사용자 역할 및 요금제
 * - 관리자 설정
 * - 사이트 설정
 * - 공지사항
 */

import { Timestamp } from 'firebase/firestore';

// ============================================
// 사용자 역할 및 요금제 타입
// ============================================

/** 사용자 역할 - 일반 사용자 또는 관리자 */
export type UserRole = 'user' | 'admin';

/** 요금제 타입 - 무료, 베이직, 프로, 프리미엄 */
export type PlanType = 'free' | 'basic' | 'pro' | 'premium';

/** 요금제 정보 (표시용) */
export const PLAN_INFO: Record<PlanType, { label: string; color: string }> = {
  free: { label: '무료', color: 'gray' },
  basic: { label: '베이직', color: 'blue' },
  pro: { label: '프로', color: 'purple' },
  premium: { label: '프리미엄', color: 'yellow' },
};

// ============================================
// 확장된 사용자 프로필 (관리자용)
// ============================================

/** 관리자 페이지에서 사용하는 확장된 사용자 프로필 */
export interface AdminUserProfile {
  id: string;                              // Firebase UID
  email: string;                           // 이메일
  displayName?: string;                    // Google 표시명
  nickname?: string;                       // AlphaBoard 닉네임
  photoURL?: string;                       // 프로필 사진 URL
  avatarId?: string;                       // 선택한 아바타 ID

  // 관리자 관련 필드
  role: UserRole;                          // 사용자 역할
  plan: PlanType;                          // 요금제
  planExpiresAt?: Timestamp;               // 구독 만료일 (null이면 무제한)
  isBanned: boolean;                       // 정지 여부

  // 메타데이터
  onboardingCompleted?: boolean;           // 온보딩 완료 여부
  createdAt: Timestamp;                    // 가입일
  updatedAt?: Timestamp;                   // 정보 수정일
}

/** 사용자 목록 조회용 간략 정보 */
export interface AdminUserListItem {
  id: string;
  email: string;
  nickname?: string;
  displayName?: string;
  plan: PlanType;
  isBanned: boolean;
  createdAt: Timestamp;
}

// ============================================
// 관리자 설정 (adminSettings 컬렉션)
// ============================================

/** 관리자 설정 문서 구조 */
export interface AdminSettings {
  id: 'config';                            // 문서 ID (고정값)
  adminEmails: string[];                   // 관리자 이메일 목록
  updatedAt: Timestamp;                    // 마지막 수정일
}

// ============================================
// 사이트 설정 (siteSettings 컬렉션)
// ============================================

/** 사이트 설정 문서 구조 */
export interface SiteSettings {
  id: 'main';                              // 문서 ID (고정값)
  privacyPolicy: string;                   // 개인정보처리방침 (HTML/Markdown)
  termsOfService: string;                  // 이용약관 (HTML/Markdown)
  updatedAt: Timestamp;                    // 마지막 수정일
}

// ============================================
// 공지사항 (announcements 컬렉션)
// ============================================

/** 공지사항 문서 구조 */
export interface Announcement {
  id: string;                              // 문서 ID
  title: string;                           // 공지 제목
  content: string;                         // 공지 내용 (HTML/Markdown)
  isActive: boolean;                       // 활성화 여부
  isPinned: boolean;                       // 상단 고정 여부
  createdAt: Timestamp;                    // 작성일
  updatedAt: Timestamp;                    // 수정일
}

/** 공지사항 생성용 DTO */
export interface CreateAnnouncementDTO {
  title: string;
  content: string;
  isActive?: boolean;
  isPinned?: boolean;
}

/** 공지사항 수정용 DTO */
export interface UpdateAnnouncementDTO {
  title?: string;
  content?: string;
  isActive?: boolean;
  isPinned?: boolean;
}

// ============================================
// 대시보드 통계 타입
// ============================================

/** 대시보드 통계 데이터 */
export interface DashboardStats {
  totalUsers: number;                      // 총 사용자 수
  todaySignups: number;                    // 오늘 가입자 수
  usersByPlan: Record<PlanType, number>;   // 요금제별 사용자 수
  recentUsers: AdminUserListItem[];        // 최근 가입한 사용자 목록
}

// ============================================
// 사용자 검색/필터 타입
// ============================================

/** 사용자 검색 조건 */
export interface UserSearchParams {
  query?: string;                          // 이메일 또는 닉네임 검색어
  plan?: PlanType | 'all';                 // 요금제 필터
  isBanned?: boolean | 'all';              // 정지 여부 필터
  page?: number;                           // 페이지 번호 (1부터 시작)
  limit?: number;                          // 페이지당 항목 수
}

/** 페이지네이션 정보 */
export interface PaginationInfo {
  currentPage: number;                     // 현재 페이지
  totalPages: number;                      // 전체 페이지 수
  totalItems: number;                      // 전체 항목 수
  itemsPerPage: number;                    // 페이지당 항목 수
}

/** 사용자 목록 응답 */
export interface UserListResponse {
  users: AdminUserListItem[];
  pagination: PaginationInfo;
}

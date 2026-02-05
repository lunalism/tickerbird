/**
 * Firestore 유틸리티 함수
 *
 * Firestore 컬렉션 참조 및 공통 CRUD 헬퍼 함수들
 * Firebase SDK v9+ 모듈러 문법 사용
 *
 * 컬렉션 구조:
 * - users/{uid}: 사용자 프로필
 * - watchlist/{docId}: 관심종목
 * - posts/{postId}: 게시글
 * - posts/{postId}/comments/{commentId}: 댓글 (서브컬렉션)
 * - posts/{postId}/likes/{docId}: 좋아요 (서브컬렉션)
 * - price_alerts/{alertId}: 가격 알림
 */

import {
  collection,
  doc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
  type DocumentData,
  type QueryConstraint,
  type CollectionReference,
  type DocumentReference,
} from 'firebase/firestore';
import { db } from './firebase';

// ==================== 컬렉션 참조 헬퍼 ====================

/**
 * users 컬렉션 참조
 * 사용자 프로필 정보 저장
 */
export const usersCollection = () => collection(db, 'users');

/**
 * 특정 사용자 문서 참조
 * @param uid - 사용자 ID (Firebase Auth uid)
 */
export const userDoc = (uid: string) => doc(db, 'users', uid);

/**
 * watchlist 컬렉션 참조
 * 관심종목 저장
 */
export const watchlistCollection = () => collection(db, 'watchlist');

/**
 * posts 컬렉션 참조
 * 커뮤니티 게시글 저장
 */
export const postsCollection = () => collection(db, 'posts');

/**
 * 특정 게시글 문서 참조
 * @param postId - 게시글 ID
 */
export const postDoc = (postId: string) => doc(db, 'posts', postId);

/**
 * 특정 게시글의 comments 서브컬렉션 참조
 * @param postId - 게시글 ID
 */
export const commentsCollection = (postId: string) =>
  collection(db, 'posts', postId, 'comments');

/**
 * 특정 댓글 문서 참조
 * @param postId - 게시글 ID
 * @param commentId - 댓글 ID
 */
export const commentDoc = (postId: string, commentId: string) =>
  doc(db, 'posts', postId, 'comments', commentId);

/**
 * 특정 게시글의 likes 서브컬렉션 참조
 * @param postId - 게시글 ID
 */
export const likesCollection = (postId: string) =>
  collection(db, 'posts', postId, 'likes');

/**
 * price_alerts 컬렉션 참조
 * 가격 알림 저장
 */
export const alertsCollection = () => collection(db, 'price_alerts');

/**
 * 특정 알림 문서 참조
 * @param alertId - 알림 ID
 */
export const alertDoc = (alertId: string) => doc(db, 'price_alerts', alertId);

/**
 * company_info 컬렉션 참조
 * AI 생성 회사 소개 저장
 */
export const companyInfoCollection = () => collection(db, 'company_info');

/**
 * 특정 회사 정보 문서 참조
 * @param symbol - 종목 심볼
 */
export const companyInfoDoc = (symbol: string) => doc(db, 'company_info', symbol);

/**
 * calendar_events 컬렉션 참조
 * 경제 캘린더 이벤트 저장
 *
 * 문서 구조:
 * - title: 이벤트 제목 (예: "FOMC 정례회의")
 * - titleEn: 영문 제목 (예: "FOMC Meeting")
 * - date: 날짜 (YYYY-MM-DD)
 * - endDate: 종료일 (2일 이상인 경우, 선택)
 * - category: 카테고리 (institution, earnings, corporate, crypto, options, dividend)
 * - countryCode: 국가 코드 (us, kr, jp 등)
 * - importance: 중요도 (high, medium, low)
 * - time: 한국 시간 (HH:MM)
 * - description: 설명
 * - relatedTerms: 관련 용어 배열 (용어사전 연동용)
 * - createdAt: 생성일
 * - updatedAt: 수정일
 */
export const calendarEventsCollection = () => collection(db, 'calendar_events');

/**
 * 특정 캘린더 이벤트 문서 참조
 * @param eventId - 이벤트 ID
 */
export const calendarEventDoc = (eventId: string) => doc(db, 'calendar_events', eventId);

/**
 * etf_holdings 컬렉션 참조
 * ETF 구성종목 정보 저장
 *
 * 문서 구조:
 * - symbol: ETF 심볼 (예: "QQQ")
 * - name: ETF 이름 (예: "Invesco QQQ Trust")
 * - description: 한글 설명 (예: "나스닥 100 추종 ETF")
 * - holdings: 구성종목 배열
 *   - symbol: 종목 심볼
 *   - name: 종목명
 *   - weight: 비중 (%)
 * - totalHoldings: 전체 구성종목 수
 * - updatedAt: 마지막 업데이트 날짜
 */
export const etfHoldingsCollection = () => collection(db, 'etf_holdings');

/**
 * 특정 ETF 구성종목 문서 참조
 * @param symbol - ETF 심볼 (예: "QQQ")
 */
export const etfHoldingsDoc = (symbol: string) => doc(db, 'etf_holdings', symbol);

/**
 * rewrittenNews 컬렉션 참조
 * AI 재작성된 뉴스 캐시 저장
 *
 * 문서 구조:
 * - originalNewsId: 원본 뉴스 ID
 * - originalUrl: 원본 URL
 * - originalTitle: 원본 제목
 * - originalSource: 원본 출처
 * - summary: AI 요약
 * - content: 재작성된 본문
 * - investmentPoints: 투자 포인트 배열
 * - relatedStocks: 관련 종목 배열
 * - sentiment: 투자 심리 (positive/negative/neutral)
 * - createdAt: 생성일
 * - expiresAt: 만료일 (24시간 TTL)
 */
export const rewrittenNewsCollection = () => collection(db, 'rewrittenNews');

/**
 * 특정 재작성 뉴스 문서 참조
 * @param newsId - 원본 뉴스 ID
 */
export const rewrittenNewsDoc = (newsId: string) => doc(db, 'rewrittenNews', newsId);

/**
 * feedbacks 컬렉션 참조
 * 피드백(건의사항/불편사항) 저장
 *
 * 문서 구조:
 * - userId: 작성자 ID
 * - userEmail: 작성자 이메일
 * - userName: 작성자 이름
 * - userPhoto: 프로필 사진
 * - category: 카테고리 (bug, feature, complaint, praise, other)
 * - title: 제목
 * - content: 내용
 * - isPrivate: 비공개 여부
 * - status: 상태 (received, reviewing, resolved, rejected)
 * - adminResponse: 운영진 답변
 * - adminRespondedAt: 답변 시간
 * - likes: 공감한 userId 배열
 * - likeCount: 공감 수
 * - commentCount: 댓글 수
 * - createdAt: 작성일
 * - updatedAt: 수정일
 */
export const feedbacksCollection = () => collection(db, 'feedbacks');

/**
 * 특정 피드백 문서 참조
 * @param feedbackId - 피드백 ID
 */
export const feedbackDoc = (feedbackId: string) => doc(db, 'feedbacks', feedbackId);

/**
 * 특정 피드백의 comments 서브컬렉션 참조
 * @param feedbackId - 피드백 ID
 */
export const feedbackCommentsCollection = (feedbackId: string) =>
  collection(db, 'feedbacks', feedbackId, 'comments');

/**
 * 특정 피드백 댓글 문서 참조
 * @param feedbackId - 피드백 ID
 * @param commentId - 댓글 ID
 */
export const feedbackCommentDoc = (feedbackId: string, commentId: string) =>
  doc(db, 'feedbacks', feedbackId, 'comments', commentId);

/**
 * announcements 컬렉션 참조
 * 공지사항 저장
 *
 * 문서 구조:
 * - title: 공지 제목
 * - content: 공지 내용 (HTML - Tiptap)
 * - category: 카테고리 (notice, update, event, maintenance)
 * - isPinned: 상단 고정 여부
 * - isPublished: 발행 여부
 * - authorId: 작성자 ID
 * - authorName: 작성자 이름
 * - createdAt: 작성일
 * - updatedAt: 수정일
 */
export const announcementsCollection = () => collection(db, 'announcements');

/**
 * 특정 공지사항 문서 참조
 * @param announcementId - 공지사항 ID
 */
export const announcementDoc = (announcementId: string) => doc(db, 'announcements', announcementId);

/**
 * faq 컬렉션 참조
 * 자주 묻는 질문 저장
 *
 * 문서 구조:
 * - question: 질문
 * - answer: 답변 (HTML - Tiptap)
 * - category: 카테고리 (account, feature, payment, other)
 * - order: 정렬 순서
 * - isPublished: 발행 여부
 * - createdAt: 작성일
 * - updatedAt: 수정일
 */
export const faqCollection = () => collection(db, 'faq');

/**
 * 특정 FAQ 문서 참조
 * @param faqId - FAQ ID
 */
export const faqDoc = (faqId: string) => doc(db, 'faq', faqId);

// ==================== 타임스탬프 변환 헬퍼 ====================

/**
 * Firestore Timestamp를 ISO 문자열로 변환
 * @param timestamp - Firestore Timestamp 또는 Date 또는 문자열
 * @returns ISO 형식 문자열
 */
export const timestampToString = (timestamp: Timestamp | Date | string | null | undefined): string => {
  if (!timestamp) return new Date().toISOString();

  if (timestamp instanceof Timestamp) {
    return timestamp.toDate().toISOString();
  }

  if (timestamp instanceof Date) {
    return timestamp.toISOString();
  }

  return timestamp;
};

/**
 * 서버 타임스탬프 생성
 * Firestore 서버의 현재 시간 사용
 */
export { serverTimestamp };

// ==================== 공통 CRUD 헬퍼 ====================

/**
 * 컬렉션 쿼리 실행
 * @param collectionRef - 컬렉션 참조
 * @param constraints - 쿼리 조건 배열
 * @returns 문서 배열
 */
export async function queryCollection<T = DocumentData>(
  collectionRef: CollectionReference,
  constraints: QueryConstraint[] = []
): Promise<(T & { id: string })[]> {
  const q = query(collectionRef, ...constraints);
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as T),
  }));
}

/**
 * 단일 문서 조회
 * @param docRef - 문서 참조
 * @returns 문서 데이터 또는 null
 */
export async function getDocument<T = DocumentData>(
  docRef: DocumentReference
): Promise<(T & { id: string }) | null> {
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...(snapshot.data() as T),
  };
}

/**
 * 문서 생성 (자동 ID)
 * @param collectionRef - 컬렉션 참조
 * @param data - 저장할 데이터
 * @returns 생성된 문서 ID
 */
export async function createDocument<T extends DocumentData>(
  collectionRef: CollectionReference,
  data: T
): Promise<string> {
  const docRef = await addDoc(collectionRef, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

/**
 * 문서 생성/수정 (지정 ID)
 * @param docRef - 문서 참조
 * @param data - 저장할 데이터
 * @param merge - 기존 데이터와 병합 여부 (기본: true)
 */
export async function setDocument<T extends DocumentData>(
  docRef: DocumentReference,
  data: T,
  merge: boolean = true
): Promise<void> {
  await setDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  }, { merge });
}

/**
 * 문서 부분 업데이트
 * @param docRef - 문서 참조
 * @param data - 업데이트할 데이터
 */
export async function updateDocument<T extends Partial<DocumentData>>(
  docRef: DocumentReference,
  data: T
): Promise<void> {
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * 문서 삭제
 * @param docRef - 문서 참조
 */
export async function deleteDocument(docRef: DocumentReference): Promise<void> {
  await deleteDoc(docRef);
}

// ==================== 쿼리 빌더 헬퍼 (re-export) ====================

export { where, orderBy, limit, startAfter, query, getDocs, getDoc, addDoc, updateDoc, deleteDoc, doc, collection };

// ==================== 타입 정의 ====================

/**
 * Firestore 관심종목 문서 타입
 */
export interface FirestoreWatchlistItem {
  userId: string;
  ticker: string;
  market: string;
  stockName: string;
  createdAt: Timestamp;
}

/**
 * Firestore 게시글 문서 타입
 *
 * 작성자 정보:
 * - authorName: 닉네임 (표시용)
 * - authorHandle: @아이디 (이메일 앞부분, 고유 식별자)
 * - authorPhotoURL: 프로필 이미지 URL
 */
export interface FirestorePost {
  userId: string;
  authorName: string;              // 닉네임 (표시용)
  authorHandle?: string;           // @아이디 (고유 식별자, optional - 기존 글 호환)
  authorPhotoURL: string | null;   // 프로필 이미지 URL
  content: string;
  category: string;
  tickers: string[];           // 종목 코드 배열 ["005930", "AAPL", "TSLA"]
  markets: string[];           // 시장 코드 배열 ["KR", "US"]
  tickerNames: string[];       // 종목명 배열 ["삼성전자", "Apple", "Tesla"]
  hashtags: string[];
  likesCount: number;
  commentsCount: number;
  repostsCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Firestore 댓글 문서 타입 (posts/{postId}/comments 서브컬렉션)
 *
 * 작성자 정보:
 * - authorName: 닉네임 (표시용)
 * - authorHandle: @아이디 (이메일 앞부분, 고유 식별자)
 * - authorPhotoURL: 프로필 이미지 URL
 */
export interface FirestoreComment {
  userId: string;
  authorName: string;              // 닉네임 (표시용)
  authorHandle?: string;           // @아이디 (고유 식별자, optional - 기존 글 호환)
  authorPhotoURL: string | null;   // 프로필 이미지 URL
  content: string;
  createdAt: Timestamp;
}

/**
 * Firestore 좋아요 문서 타입 (posts/{postId}/likes 서브컬렉션)
 */
export interface FirestoreLike {
  userId: string;
  createdAt: Timestamp;
}

/**
 * Firestore 가격 알림 문서 타입
 */
export interface FirestoreAlert {
  userId: string;
  ticker: string;
  market: string;
  stockName: string;
  targetPrice: number;
  direction: string;
  isActive: boolean;
  isTriggered: boolean;
  createdAt: Timestamp;
  triggeredAt: Timestamp | null;
}

/**
 * Firestore 캘린더 이벤트 문서 타입
 *
 * 경제 캘린더 이벤트 저장
 * - FOMC 회의, CPI 발표, GDP 발표 등 경제 지표
 * - 실적 발표 (earnings)
 * - 기업 이벤트 (corporate)
 * - 암호화폐 이벤트 (crypto)
 */
export interface FirestoreCalendarEvent {
  /** 이벤트 제목 (한글) */
  title: string;
  /** 영문 제목 (선택) */
  titleEn?: string;
  /** 날짜 (YYYY-MM-DD) */
  date: string;
  /** 종료일 (2일 이상인 경우, 선택) */
  endDate?: string;
  /** 카테고리 */
  category: 'institution' | 'earnings' | 'corporate' | 'crypto' | 'options' | 'dividend';
  /** 국가 코드 (us, kr, jp 등) - institution용 */
  countryCode?: string;
  /** 기업 도메인 (로고용) - earnings, corporate, crypto용 */
  companyDomain?: string;
  /** 중요도 */
  importance: 'high' | 'medium' | 'low';
  /** 한국 시간 (HH:MM) */
  time?: string;
  /** 설명 */
  description?: string;
  /** 관련 용어 배열 (용어사전 연동용) */
  relatedTerms?: string[];
  /** 생성일 */
  createdAt: Timestamp;
  /** 수정일 */
  updatedAt: Timestamp;
}

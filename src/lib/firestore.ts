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
 */
export interface FirestorePost {
  userId: string;
  authorName: string;
  authorPhotoURL: string | null;
  content: string;
  category: string;
  tickers: string[];
  hashtags: string[];
  likesCount: number;
  commentsCount: number;
  repostsCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Firestore 댓글 문서 타입 (posts/{postId}/comments 서브컬렉션)
 */
export interface FirestoreComment {
  userId: string;
  authorName: string;
  authorPhotoURL: string | null;
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

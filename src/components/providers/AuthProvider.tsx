'use client';

/**
 * AuthProvider - Firebase 기반 전역 인증 상태 관리
 *
 * React Context를 사용하여 전역에서 인증 상태를 관리합니다.
 * Sidebar, ProfilePage 등 모든 컴포넌트에서 useAuth() 훅으로 접근 가능합니다.
 *
 * 주요 기능:
 * - Firebase Auth 상태 실시간 감지 (onAuthStateChanged)
 * - Google 팝업 로그인 (signInWithPopup)
 * - 로그아웃 (signOut)
 * - Firestore에 사용자 프로필 저장/조회
 * - 신규 사용자 온보딩 (닉네임 설정)
 * Firebase SDK v9+ 모듈러 문법 사용
 */

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  type User as FirebaseUser,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { OnboardingModal } from '@/components/features/onboarding';
import { debug } from '@/lib/debug';

/**
 * 사용자 프로필 타입 (앱 내부용)
 *
 * Firebase Auth의 User 객체와 Firestore users 컬렉션 데이터를 조합
 *
 * 닉네임 표시 우선순위:
 * 1. nickname (Tickerbird 전용 닉네임) - 최우선
 * 2. displayName (Google 이름) - 닉네임 없을 때 fallback
 * 3. email의 @ 앞부분 - 둘 다 없을 때 fallback
 *
 * 아바타 표시 우선순위:
 * 1. avatarId가 있으면 → /avatars/avatar-{id}.png 표시
 * 2. avatarUrl이 있으면 → Google 프로필 사진 표시
 * 3. 둘 다 없으면 → 닉네임 첫 글자로 이니셜 아바타 표시
 */
export interface UserProfile {
  // Firebase Auth uid (Firestore 문서 ID와 동일)
  id: string;
  // 사용자 이메일
  email: string;
  // Tickerbird 전용 닉네임 (온보딩에서 설정, 최우선 표시)
  nickname: string;
  // Google displayName (참고용, 닉네임 없을 때 fallback)
  displayName: string;
  // 선택한 아바타 ID (예: 'bull', 'bear' 등) - 최우선 표시
  avatarId?: string;
  // 프로필 이미지 URL (Google 프로필 사진) - avatarId 없을 때 fallback
  avatarUrl?: string;
  // 온보딩 완료 여부
  onboardingCompleted: boolean;
  // 요금제 (free 또는 premium)
  plan: 'free' | 'premium';
}

/**
 * Context 타입 정의
 *
 * 컴포넌트에서 useAuth() 훅으로 접근할 수 있는 값들
 */
interface AuthContextType {
  // Firebase Auth 원본 User 객체
  user: FirebaseUser | null;
  // 앱 내부용 프로필 (Firestore에서 조회)
  userProfile: UserProfile | null;
  // 로딩 상태 (초기 세션 확인 중)
  isLoading: boolean;
  // 프로필 로딩 상태 (Firestore 조회 중)
  isProfileLoading: boolean;
  // 로그인 여부
  isLoggedIn: boolean;
  // 프리미엄 사용자 여부 (AI 뉴스 등 고급 기능 사용 가능)
  isPremium: boolean;
  // 온보딩 필요 여부 (nickname이 없거나 onboardingCompleted가 false)
  needsOnboarding: boolean;
  // Google 로그인 실행
  signInWithGoogle: () => Promise<void>;
  // 로그아웃 실행
  signOut: () => Promise<void>;
  // Firestore에서 프로필 새로고침
  refreshProfile: () => Promise<void>;
  // 온보딩 완료 (닉네임 + 아바타 저장)
  completeOnboarding: (nickname: string, avatarId: string) => Promise<void>;
  // 닉네임 업데이트 (프로필 수정에서 사용)
  updateNickname: (nickname: string) => Promise<void>;
  // 아바타 업데이트 (아바타 선택에서 사용)
  updateAvatarId: (avatarId: string) => Promise<void>;
}

// Context 생성 (기본값 undefined)
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Google 로그인 프로바이더 (싱글톤)
const googleProvider = new GoogleAuthProvider();

/**
 * Firestore 사용자 데이터 타입 (내부용)
 */
interface FirestoreUserData {
  email?: string;
  displayName?: string;
  nickname?: string;
  photoURL?: string;
  avatarId?: string; // 선택한 아바타 ID
  onboardingCompleted?: boolean;
  plan?: 'free' | 'premium'; // 요금제
  createdAt?: unknown;
  updatedAt?: unknown;
}

/**
 * Firebase User와 Firestore 데이터에서 UserProfile 생성
 *
 * @param user - Firebase Auth User 객체
 * @param firestoreData - Firestore에서 조회한 데이터 (선택)
 * @returns UserProfile 객체
 */
const createUserProfile = (
  user: FirebaseUser,
  firestoreData?: FirestoreUserData | null
): UserProfile => ({
  id: user.uid,
  email: user.email || '',
  // Tickerbird 닉네임 (온보딩에서 설정, 없으면 빈 문자열)
  nickname: firestoreData?.nickname || '',
  // Google displayName (fallback용)
  displayName: user.displayName || user.email?.split('@')[0] || '사용자',
  // 선택한 아바타 ID (최우선 표시)
  avatarId: firestoreData?.avatarId || undefined,
  // Google 프로필 사진 URL (avatarId 없을 때 fallback)
  avatarUrl: firestoreData?.photoURL || user.photoURL || undefined,
  // 온보딩 완료 여부 (기본값 false)
  onboardingCompleted: firestoreData?.onboardingCompleted ?? false,
  // 요금제 (기본값 free)
  plan: firestoreData?.plan || 'free',
});

/**
 * AuthProvider 컴포넌트
 *
 * 앱의 최상위에서 한 번만 렌더링되며, 전역 인증 상태를 관리합니다.
 * 페이지 이동해도 언마운트되지 않으므로 상태가 유지됩니다.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  // === 상태 관리 ===

  // Firebase Auth User 객체
  const [user, setUser] = useState<FirebaseUser | null>(null);
  // 앱 내부용 프로필 (Firestore 데이터 포함)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  // 초기 로딩 상태 (Auth 상태 확인 중)
  const [isLoading, setIsLoading] = useState(true);
  // 프로필 로딩 상태 (Firestore 조회 중)
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  // 온보딩 필요 여부 (nickname이 없거나 onboardingCompleted가 false)
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  /**
   * Firestore users 컬렉션에서 사용자 프로필 조회
   *
   * - 프로필이 없으면 신규 사용자 → Firestore에 기본 정보 생성
   * - onboardingCompleted가 false이거나 nickname이 없으면 온보딩 필요
   * - 로그인 시 호출되어 온보딩 필요 여부 판별
   *
   * @param firebaseUser - Firebase Auth User 객체
   * @returns 온보딩 필요 여부 (true: 필요, false: 불필요)
   */
  const checkUserProfile = useCallback(async (firebaseUser: FirebaseUser): Promise<boolean> => {
    setIsProfileLoading(true);
    try {
      // Firestore에서 users/{uid} 문서 조회
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        // 문서가 없으면 신규 사용자 → Firestore에 기본 정보 저장
        debug.log('[AuthProvider] 신규 사용자 - Firestore에 프로필 생성');
        const initialData: FirestoreUserData = {
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || '',
          photoURL: firebaseUser.photoURL || '',
          nickname: '', // 닉네임은 온보딩에서 설정
          onboardingCompleted: false, // 온보딩 미완료 상태로 생성
        };
        await setDoc(userDocRef, {
          ...initialData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        setNeedsOnboarding(true);
        setUserProfile(createUserProfile(firebaseUser, initialData));
        return true;
      }

      // 문서가 있으면 onboardingCompleted와 nickname 확인
      const userData = userDoc.data() as FirestoreUserData;

      // 온보딩 완료 여부 확인: onboardingCompleted가 true이고 nickname이 있으면 완료
      const isOnboardingComplete = userData.onboardingCompleted === true && !!userData.nickname;

      if (!isOnboardingComplete) {
        // 온보딩 미완료
        debug.log('[AuthProvider] 온보딩 필요 - nickname 또는 onboardingCompleted 없음');
        setNeedsOnboarding(true);
        setUserProfile(createUserProfile(firebaseUser, userData));
        return true;
      }

      // 기존 사용자 - 온보딩 완료됨
      debug.log('[AuthProvider] 기존 사용자:', userData.nickname);
      setNeedsOnboarding(false);
      setUserProfile(createUserProfile(firebaseUser, userData));
      return false;
    } catch (err) {
      // 에러 시에도 기본 프로필 설정 (앱 사용은 가능하게)
      console.error('[AuthProvider] 프로필 조회 에러:', err);
      setUserProfile(createUserProfile(firebaseUser, null));
      return false;
    } finally {
      setIsProfileLoading(false);
    }
  }, []);

  /**
   * Google 로그인 실행
   *
   * Google 팝업을 열어 로그인 진행
   * 로그인 성공 시 onAuthStateChanged에서 상태 업데이트됨
   *
   * 모바일에서 팝업이 실패하는 경우 (특히 iOS Safari)
   * 에러 코드를 상세히 로깅하여 디버깅에 활용
   */
  const handleSignInWithGoogle = useCallback(async () => {
    try {
      debug.log('[AuthProvider] Google 로그인 시작...');
      debug.log('[AuthProvider] Firebase auth 상태:', auth ? 'initialized' : 'null');
      debug.log('[AuthProvider] 현재 URL:', typeof window !== 'undefined' ? window.location.href : 'SSR');

      await signInWithPopup(auth, googleProvider);
      // 성공 시 onAuthStateChanged가 자동으로 호출됨
      debug.log('[AuthProvider] Google 로그인 성공');
    } catch (err: unknown) {
      // Firebase 에러 코드 상세 로깅
      const firebaseError = err as { code?: string; message?: string; customData?: unknown };
      console.error('[AuthProvider] Google 로그인 에러:', {
        code: firebaseError.code,
        message: firebaseError.message,
        customData: firebaseError.customData,
        fullError: err,
      });

      // 일반적인 Firebase Auth 에러 코드:
      // - auth/popup-blocked: 팝업이 차단됨
      // - auth/popup-closed-by-user: 사용자가 팝업을 닫음
      // - auth/unauthorized-domain: 승인되지 않은 도메인
      // - auth/operation-not-allowed: 로그인 방식이 비활성화됨
      // - auth/invalid-api-key: 잘못된 API 키
      if (firebaseError.code === 'auth/unauthorized-domain') {
        console.error('[AuthProvider] 현재 도메인이 Firebase 승인 도메인에 등록되지 않았습니다.');
        console.error('[AuthProvider] Firebase Console > Authentication > Settings > Authorized domains에 도메인을 추가하세요.');
      }

      throw err; // 호출한 곳에서 에러 처리하도록 전파
    }
  }, []);

  /**
   * 로그아웃 실행
   *
   * Firebase Auth 세션 종료
   * onAuthStateChanged에서 상태 초기화됨
   */
  const handleSignOut = useCallback(async () => {
    try {
      debug.log('[AuthProvider] 로그아웃 시작...');

      // Firebase 로그아웃
      await firebaseSignOut(auth);
      // 성공 시 onAuthStateChanged가 자동으로 호출됨
      debug.log('[AuthProvider] 로그아웃 완료');
    } catch (err) {
      console.error('[AuthProvider] 로그아웃 에러:', err);
      throw err;
    }
  }, []);

  /**
   * 온보딩 완료 처리 (닉네임 + 아바타 설정)
   *
   * Firestore users/{uid} 문서에 nickname, avatarId, onboardingCompleted 저장
   * 온보딩 모달에서 호출
   *
   * @param nickname - Tickerbird 전용 닉네임
   * @param avatarId - 선택한 아바타 ID (예: 'bull', 'bear' 등)
   */
  const completeOnboarding = useCallback(async (nickname: string, avatarId: string) => {
    if (!user) {
      throw new Error('로그인이 필요합니다');
    }

    try {
      // Firestore 업데이트 - nickname, avatarId, onboardingCompleted 저장
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, {
        nickname: nickname,
        avatarId: avatarId,
        onboardingCompleted: true,
        updatedAt: serverTimestamp(),
      }, { merge: true }); // merge: 기존 필드 유지하고 업데이트

      // 상태 업데이트
      setNeedsOnboarding(false);
      setUserProfile(prev => prev ? {
        ...prev,
        nickname,
        avatarId,
        onboardingCompleted: true,
      } : null);
      debug.log('[AuthProvider] 온보딩 완료:', nickname, avatarId);
    } catch (err) {
      console.error('[AuthProvider] 온보딩 완료 에러:', err);
      throw err;
    }
  }, [user]);

  /**
   * 닉네임 업데이트 (프로필 수정에서 사용)
   *
   * Firestore users/{uid} 문서의 nickname 필드 업데이트
   *
   * @param nickname - 새 닉네임
   */
  const updateNickname = useCallback(async (nickname: string) => {
    if (!user) {
      throw new Error('로그인이 필요합니다');
    }

    try {
      // Firestore 업데이트
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, {
        nickname: nickname,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      // 상태 업데이트
      setUserProfile(prev => prev ? { ...prev, nickname } : null);
      debug.log('[AuthProvider] 닉네임 업데이트 완료:', nickname);
    } catch (err) {
      console.error('[AuthProvider] 닉네임 업데이트 에러:', err);
      throw err;
    }
  }, [user]);

  /**
   * 아바타 ID 업데이트 (아바타 선택에서 사용)
   *
   * Firestore users/{uid} 문서의 avatarId 필드 업데이트
   *
   * @param avatarId - 새 아바타 ID (예: 'bull', 'bear' 등)
   */
  const updateAvatarId = useCallback(async (avatarId: string) => {
    if (!user) {
      throw new Error('로그인이 필요합니다');
    }

    try {
      // Firestore 업데이트
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, {
        avatarId: avatarId,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      // 상태 업데이트
      setUserProfile(prev => prev ? { ...prev, avatarId } : null);
      debug.log('[AuthProvider] 아바타 업데이트 완료:', avatarId);
    } catch (err) {
      console.error('[AuthProvider] 아바타 업데이트 에러:', err);
      throw err;
    }
  }, [user]);

  /**
   * 프로필 새로고침 (Firestore에서 최신 정보 가져오기)
   */
  const refreshProfile = useCallback(async () => {
    if (!user) return;
    await checkUserProfile(user);
  }, [user, checkUserProfile]);

  /**
   * Firebase Auth 상태 변경 감지
   *
   * 앱 시작 시, 로그인/로그아웃 시 자동으로 호출됨
   */
  useEffect(() => {
    debug.log('[AuthProvider] Auth 상태 감지 시작...');

    // onAuthStateChanged 구독
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      debug.log('[AuthProvider] Auth 상태 변경:', firebaseUser?.email || '로그아웃');

      if (firebaseUser) {
        // 로그인 상태
        setUser(firebaseUser);
        // Firestore에서 프로필 조회 (신규/기존 사용자 판별)
        await checkUserProfile(firebaseUser);
      } else {
        // 로그아웃 상태 - 프로필 초기화
        setUser(null);
        setUserProfile(null);
        setNeedsOnboarding(false);
      }

      // 초기 로딩 완료
      setIsLoading(false);
    });

    // 클린업: 구독 해제
    return () => {
      debug.log('[AuthProvider] Auth 상태 감지 해제');
      unsubscribe();
    };
  }, [checkUserProfile]);

  /**
   * 사용자 프로필 실시간 감지
   *
   * Firestore users/{uid} 문서의 변경사항을 실시간으로 감지합니다.
   * 관리자가 요금제를 변경하면 즉시 반영됩니다.
   */
  useEffect(() => {
    if (!user) return;

    debug.log('[AuthProvider] 사용자 프로필 실시간 감지 시작:', user.uid);

    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userDocRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const userData = docSnapshot.data() as FirestoreUserData;
        debug.log('[AuthProvider] 프로필 업데이트 감지:', { plan: userData.plan });

        // 프로필 업데이트 (plan 변경 등 반영)
        setUserProfile(createUserProfile(user, userData));

        // 온보딩 상태도 업데이트
        const isOnboardingComplete = userData.onboardingCompleted === true && !!userData.nickname;
        setNeedsOnboarding(!isOnboardingComplete);
      }
    }, (error) => {
      console.error('[AuthProvider] 프로필 실시간 감지 에러:', error);
    });

    return () => {
      debug.log('[AuthProvider] 사용자 프로필 실시간 감지 해제');
      unsubscribe();
    };
  }, [user]);

  // 로그인 여부
  const isLoggedIn = !!user;

  // 프리미엄 사용자 여부
  const isPremium = userProfile?.plan === 'premium';

  // Context 값
  const value: AuthContextType = {
    user,
    userProfile,
    isLoading,
    isProfileLoading,
    isLoggedIn,
    isPremium,
    needsOnboarding,
    signInWithGoogle: handleSignInWithGoogle,
    signOut: handleSignOut,
    refreshProfile,
    completeOnboarding,
    updateNickname,
    updateAvatarId,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      {/* 온보딩 모달 - 신규 사용자에게 닉네임 설정 요청 */}
      <OnboardingModal />
    </AuthContext.Provider>
  );
}

/**
 * useAuth 훅
 *
 * AuthProvider 내부에서 인증 상태에 접근하기 위한 훅입니다.
 * Sidebar, ProfilePage, OnboardingModal 등에서 사용합니다.
 *
 * @example
 * const { userProfile, isLoggedIn, needsOnboarding, signInWithGoogle, signOut, completeOnboarding } = useAuth();
 *
 * // Google 로그인
 * await signInWithGoogle();
 *
 * // 로그아웃
 * await signOut();
 *
 * // 온보딩 완료
 * await completeOnboarding('닉네임');
 *
 * // 사용자 이름 표시 (우선순위: nickname > displayName)
 * <p>{userProfile?.nickname || userProfile?.displayName}</p>
 * <img src={userProfile?.avatarUrl} />
 *
 * // 로딩 중 스켈레톤 표시
 * if (isLoading) return <Skeleton />;
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}

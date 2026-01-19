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
 * - 신규 사용자 감지 및 온보딩 지원
 *
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
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

/**
 * 사용자 프로필 타입 (앱 내부용)
 *
 * Firebase Auth의 User 객체와 Firestore users 컬렉션 데이터를 조합
 */
export interface UserProfile {
  // Firebase Auth uid (Firestore 문서 ID와 동일)
  id: string;
  // 사용자 이메일
  email: string;
  // 표시 이름 (Google OAuth에서 가져오거나 온보딩에서 설정)
  name: string;
  // 프로필 이미지 URL (Google 프로필 사진)
  avatarUrl?: string;
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
  // 로그인 여부
  isLoggedIn: boolean;
  // 신규 사용자 여부 (Firestore에 name이 없음)
  isNewUser: boolean;
  // Google 로그인 실행
  signInWithGoogle: () => Promise<void>;
  // 로그아웃 실행
  signOut: () => Promise<void>;
  // Firestore에서 프로필 새로고침
  refreshProfile: () => Promise<void>;
  // 프로필 업데이트 (온보딩에서 닉네임 저장)
  updateProfile: (name: string) => Promise<void>;
  // 신규 사용자 상태 수동 설정
  setIsNewUser: (value: boolean) => void;
}

// Context 생성 (기본값 undefined)
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Google 로그인 프로바이더 (싱글톤)
const googleProvider = new GoogleAuthProvider();

/**
 * Firebase User에서 기본 UserProfile 추출
 *
 * Firestore 조회 전 임시 프로필 또는 Firestore에 name이 없을 때 사용
 *
 * @param user - Firebase Auth User 객체
 * @param profileName - Firestore에서 조회한 name (있으면 사용)
 * @returns UserProfile 객체
 */
const extractUserProfile = (user: FirebaseUser, profileName?: string | null): UserProfile => ({
  id: user.uid,
  email: user.email || '',
  // 우선순위: Firestore name > displayName > 이메일 앞부분
  name: profileName || user.displayName || user.email?.split('@')[0] || '사용자',
  avatarUrl: user.photoURL || undefined,
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
  // 초기 로딩 상태
  const [isLoading, setIsLoading] = useState(true);
  // 신규 사용자 여부 (온보딩 필요)
  const [isNewUser, setIsNewUser] = useState(false);

  /**
   * Firestore users 컬렉션에서 사용자 프로필 조회
   *
   * - 프로필이 없거나 name이 없으면 신규 사용자로 판단
   * - 로그인 시 호출되어 신규/기존 사용자 판별
   *
   * @param firebaseUser - Firebase Auth User 객체
   * @returns 신규 사용자 여부 (true: 신규, false: 기존)
   */
  const checkUserProfile = useCallback(async (firebaseUser: FirebaseUser): Promise<boolean> => {
    try {
      // Firestore에서 users/{uid} 문서 조회
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        // 문서가 없으면 신규 사용자 → Firestore에 기본 정보 저장
        console.log('[AuthProvider] 신규 사용자 - Firestore에 프로필 생성');
        await setDoc(userDocRef, {
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          // name은 온보딩에서 설정 (여기서는 저장하지 않음)
        });
        setIsNewUser(true);
        setUserProfile(extractUserProfile(firebaseUser));
        return true;
      }

      // 문서가 있으면 name 필드 확인
      const userData = userDoc.data();
      if (!userData.name) {
        // name이 없으면 신규 사용자 (온보딩 미완료)
        console.log('[AuthProvider] name 없음 - 온보딩 필요');
        setIsNewUser(true);
        setUserProfile(extractUserProfile(firebaseUser));
        return true;
      }

      // 기존 사용자 - Firestore의 name 사용
      console.log('[AuthProvider] 기존 사용자:', userData.name);
      setIsNewUser(false);
      setUserProfile({
        id: firebaseUser.uid,
        email: firebaseUser.email || '',
        name: userData.name,
        avatarUrl: userData.photoURL || firebaseUser.photoURL || undefined,
      });
      return false;
    } catch (err) {
      // 에러 시에도 기본 프로필 설정 (앱 사용은 가능하게)
      console.error('[AuthProvider] 프로필 조회 에러:', err);
      setUserProfile(extractUserProfile(firebaseUser));
      return false;
    }
  }, []);

  /**
   * Google 로그인 실행
   *
   * Google 팝업을 열어 로그인 진행
   * 로그인 성공 시 onAuthStateChanged에서 상태 업데이트됨
   */
  const handleSignInWithGoogle = useCallback(async () => {
    try {
      console.log('[AuthProvider] Google 로그인 시작...');
      await signInWithPopup(auth, googleProvider);
      // 성공 시 onAuthStateChanged가 자동으로 호출됨
      console.log('[AuthProvider] Google 로그인 성공');
    } catch (err) {
      console.error('[AuthProvider] Google 로그인 에러:', err);
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
      console.log('[AuthProvider] 로그아웃 시작...');
      await firebaseSignOut(auth);
      // 성공 시 onAuthStateChanged가 자동으로 호출됨
      console.log('[AuthProvider] 로그아웃 완료');
    } catch (err) {
      console.error('[AuthProvider] 로그아웃 에러:', err);
      throw err;
    }
  }, []);

  /**
   * 프로필 업데이트 (온보딩에서 닉네임 저장 시 사용)
   *
   * Firestore users/{uid} 문서의 name 필드 업데이트
   *
   * @param name - 새 닉네임
   */
  const updateProfile = useCallback(async (name: string) => {
    if (!user) {
      throw new Error('로그인이 필요합니다');
    }

    try {
      // Firestore 업데이트
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, {
        name: name,
        updatedAt: serverTimestamp(),
      }, { merge: true }); // merge: 기존 필드 유지하고 업데이트

      // 상태 업데이트
      setIsNewUser(false);
      setUserProfile(prev => prev ? { ...prev, name } : null);
      console.log('[AuthProvider] 프로필 업데이트 완료:', name);
    } catch (err) {
      console.error('[AuthProvider] 프로필 업데이트 에러:', err);
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
    console.log('[AuthProvider] Auth 상태 감지 시작...');

    // onAuthStateChanged 구독
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('[AuthProvider] Auth 상태 변경:', firebaseUser?.email || '로그아웃');

      if (firebaseUser) {
        // 로그인 상태
        setUser(firebaseUser);
        // Firestore에서 프로필 조회 (신규/기존 사용자 판별)
        await checkUserProfile(firebaseUser);
      } else {
        // 로그아웃 상태 - 모든 상태 초기화
        setUser(null);
        setUserProfile(null);
        setIsNewUser(false);
      }

      // 초기 로딩 완료
      setIsLoading(false);
    });

    // 클린업: 구독 해제
    return () => {
      console.log('[AuthProvider] Auth 상태 감지 해제');
      unsubscribe();
    };
  }, [checkUserProfile]);

  // 로그인 여부 (user가 있으면 true)
  const isLoggedIn = !!user;

  // Context 값
  const value: AuthContextType = {
    user,
    userProfile,
    isLoading,
    isLoggedIn,
    isNewUser,
    signInWithGoogle: handleSignInWithGoogle,
    signOut: handleSignOut,
    refreshProfile,
    updateProfile,
    setIsNewUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * useAuth 훅
 *
 * AuthProvider 내부에서 인증 상태에 접근하기 위한 훅입니다.
 * Sidebar, ProfilePage, OnboardingPage 등에서 사용합니다.
 *
 * @example
 * const { userProfile, isLoggedIn, isNewUser, signInWithGoogle, signOut } = useAuth();
 *
 * // Google 로그인
 * await signInWithGoogle();
 *
 * // 로그아웃
 * await signOut();
 *
 * // 사용자 정보 표시
 * <p>{userProfile?.name}</p>
 * <img src={userProfile?.avatarUrl} />
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}

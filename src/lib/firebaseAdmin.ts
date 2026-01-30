/**
 * Firebase Admin SDK 초기화
 *
 * 서버사이드에서 Firebase 서비스를 사용하기 위한 Admin SDK 설정입니다.
 * API Routes, Server Components 등에서 사용됩니다.
 *
 * ============================================================
 * 주요 기능:
 * ============================================================
 * - Firebase Storage (이미지 업로드)
 * - Firestore (서버사이드 데이터 접근)
 * - Firebase Auth (토큰 검증)
 *
 * ============================================================
 * 환경 변수 설정:
 * ============================================================
 * FIREBASE_ADMIN_PROJECT_ID: Firebase 프로젝트 ID
 * FIREBASE_ADMIN_CLIENT_EMAIL: 서비스 계정 이메일
 * FIREBASE_ADMIN_PRIVATE_KEY: 서비스 계정 개인 키 (Base64 또는 JSON)
 * FIREBASE_STORAGE_BUCKET: Storage 버킷 이름
 *
 * 또는
 *
 * GOOGLE_APPLICATION_CREDENTIALS: 서비스 계정 키 파일 경로
 */

import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getStorage, type Storage } from 'firebase-admin/storage';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

// ==================== 타입 ====================

interface FirebaseAdminConfig {
  projectId: string;
  clientEmail: string;
  privateKey: string;
  storageBucket: string;
}

// ==================== 설정 로드 ====================

/**
 * 환경 변수에서 Firebase Admin 설정 로드
 *
 * Private Key는 환경 변수에서 이스케이프된 \n을 실제 줄바꿈으로 변환합니다.
 */
function loadConfig(): FirebaseAdminConfig | null {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID
    || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;

  // Private Key: 환경 변수에서 이스케이프된 \n을 실제 줄바꿈으로 변환
  const privateKeyRaw = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  const privateKey = privateKeyRaw?.replace(/\\n/g, '\n');

  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET
    || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

  // 필수 값 확인
  if (!projectId || !clientEmail || !privateKey || !storageBucket) {
    console.warn('[FirebaseAdmin] 필수 환경 변수 누락:', {
      projectId: projectId ? '설정됨' : '미설정',
      clientEmail: clientEmail ? '설정됨' : '미설정',
      privateKey: privateKey ? '설정됨' : '미설정',
      storageBucket: storageBucket ? '설정됨' : '미설정',
    });
    return null;
  }

  return {
    projectId,
    clientEmail,
    privateKey,
    storageBucket,
  };
}

// ==================== 초기화 ====================

let adminApp: App | null = null;
let adminStorage: Storage | null = null;
let adminFirestore: Firestore | null = null;

/**
 * Firebase Admin SDK 초기화
 *
 * 싱글톤 패턴으로 한 번만 초기화됩니다.
 * 이미 초기화된 앱이 있으면 기존 앱을 반환합니다.
 */
function initializeFirebaseAdmin(): App | null {
  // 이미 초기화된 앱이 있는지 확인
  const apps = getApps();
  if (apps.length > 0) {
    return apps[0];
  }

  // 설정 로드
  const config = loadConfig();
  if (!config) {
    console.error('[FirebaseAdmin] 초기화 실패: 설정을 로드할 수 없습니다.');
    return null;
  }

  try {
    // Admin SDK 초기화
    const app = initializeApp({
      credential: cert({
        projectId: config.projectId,
        clientEmail: config.clientEmail,
        privateKey: config.privateKey,
      }),
      storageBucket: config.storageBucket,
    });

    console.log('[FirebaseAdmin] 초기화 완료:', {
      projectId: config.projectId,
      storageBucket: config.storageBucket,
    });

    return app;
  } catch (error) {
    console.error('[FirebaseAdmin] 초기화 오류:', error);
    return null;
  }
}

// ==================== 인스턴스 getter ====================

/**
 * Firebase Admin App 인스턴스 반환
 */
export function getAdminApp(): App | null {
  if (!adminApp) {
    adminApp = initializeFirebaseAdmin();
  }
  return adminApp;
}

/**
 * Firebase Admin Storage 인스턴스 반환
 *
 * 이미지 업로드 등 Storage 작업에 사용합니다.
 */
export function getAdminStorage(): Storage | null {
  const app = getAdminApp();
  if (!app) return null;

  if (!adminStorage) {
    adminStorage = getStorage(app);
  }
  return adminStorage;
}

/**
 * Firebase Admin Firestore 인스턴스 반환
 *
 * 서버사이드에서 Firestore 데이터 접근에 사용합니다.
 */
export function getAdminFirestore(): Firestore | null {
  const app = getAdminApp();
  if (!app) return null;

  if (!adminFirestore) {
    adminFirestore = getFirestore(app);
  }
  return adminFirestore;
}

/**
 * Firebase Admin SDK가 사용 가능한지 확인
 */
export function isAdminAvailable(): boolean {
  return getAdminApp() !== null;
}

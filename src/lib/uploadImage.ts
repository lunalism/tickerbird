/**
 * 이미지 업로드 유틸리티
 *
 * Firebase Storage를 사용하여 이미지를 업로드하고 다운로드 URL을 반환합니다.
 * Tiptap 에디터에서 이미지 삽입 시 사용됩니다.
 *
 * ============================================================
 * 사용 방법:
 * ============================================================
 * import { uploadImage } from '@/lib/uploadImage';
 *
 * const result = await uploadImage(file, 'announcements');
 * if (result.success) {
 *   console.log('업로드 완료:', result.url);
 * } else {
 *   console.error('업로드 실패:', result.error);
 * }
 *
 * ============================================================
 * 저장 경로:
 * ============================================================
 * - 공지사항: content/announcements/images/{timestamp}_{filename}
 * - FAQ: content/faq/images/{timestamp}_{filename}
 * - 기타: content/general/images/{timestamp}_{filename}
 */

import { storage } from '@/lib/firebase';
import {
  ref,
  uploadBytes,
  getDownloadURL,
} from 'firebase/storage';

// ==================== 상수 ====================

/** 허용되는 이미지 MIME 타입 */
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
];

/** 최대 파일 크기 (5MB) */
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/** 컨텐츠 타입별 저장 경로 */
type ContentType = 'announcements' | 'faq' | 'general';

// ==================== 타입 정의 ====================

/** 업로드 결과 (성공) */
interface UploadSuccess {
  success: true;
  url: string;
  path: string;
  filename: string;
}

/** 업로드 결과 (실패) */
interface UploadError {
  success: false;
  error: string;
}

/** 업로드 결과 타입 */
export type UploadResult = UploadSuccess | UploadError;

/** 업로드 진행 콜백 */
export type UploadProgressCallback = (progress: number) => void;

// ==================== 유틸 함수 ====================

/**
 * 파일명에서 안전한 문자만 추출
 *
 * 특수문자, 공백 등을 제거하고 안전한 파일명으로 변환합니다.
 *
 * @param filename - 원본 파일명
 * @returns 안전한 파일명
 */
function sanitizeFilename(filename: string): string {
  // 확장자 분리
  const lastDotIndex = filename.lastIndexOf('.');
  const name = lastDotIndex > 0 ? filename.slice(0, lastDotIndex) : filename;
  const ext = lastDotIndex > 0 ? filename.slice(lastDotIndex) : '';

  // 파일명에서 안전하지 않은 문자 제거
  const safeName = name
    .replace(/[^a-zA-Z0-9가-힣_-]/g, '_') // 알파벳, 숫자, 한글, _, - 외 모두 _ 로 치환
    .replace(/_+/g, '_') // 연속된 _ 를 하나로
    .slice(0, 50); // 최대 50자

  return `${safeName}${ext.toLowerCase()}`;
}

/**
 * 고유한 파일 경로 생성
 *
 * 타임스탬프와 랜덤 문자열을 조합하여 충돌 방지
 *
 * @param contentType - 컨텐츠 타입 (announcements, faq, general)
 * @param filename - 원본 파일명
 * @returns 고유한 Storage 경로
 */
function generateUniquePath(contentType: ContentType, filename: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const safeFilename = sanitizeFilename(filename);

  return `content/${contentType}/images/${timestamp}_${random}_${safeFilename}`;
}

// ==================== 메인 함수 ====================

/**
 * 이미지 파일 업로드
 *
 * Firebase Storage에 이미지를 업로드하고 다운로드 URL을 반환합니다.
 * 파일 검증 (타입, 크기)을 수행하고 안전한 경로에 저장합니다.
 *
 * @param file - 업로드할 File 객체
 * @param contentType - 컨텐츠 타입 (저장 경로 결정)
 * @returns 업로드 결과 (URL 또는 에러)
 *
 * @example
 * const file = event.target.files[0];
 * const result = await uploadImage(file, 'announcements');
 *
 * if (result.success) {
 *   editor.chain().focus().setImage({ src: result.url }).run();
 * } else {
 *   alert(result.error);
 * }
 */
export async function uploadImage(
  file: File,
  contentType: ContentType = 'general'
): Promise<UploadResult> {
  try {
    // ========================================
    // 1. 파일 타입 검증
    // ========================================
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return {
        success: false,
        error: `지원하지 않는 이미지 형식입니다. (지원: JPG, PNG, GIF, WebP, SVG)`,
      };
    }

    // ========================================
    // 2. 파일 크기 검증
    // ========================================
    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / 1024 / 1024).toFixed(1);
      return {
        success: false,
        error: `파일 크기가 너무 큽니다. (${sizeMB}MB / 최대 5MB)`,
      };
    }

    // ========================================
    // 3. 고유 경로 생성
    // ========================================
    const storagePath = generateUniquePath(contentType, file.name);

    // ========================================
    // 4. Storage 참조 생성
    // ========================================
    const storageRef = ref(storage, storagePath);

    // ========================================
    // 5. 파일 업로드
    // ========================================
    console.log('[uploadImage] 업로드 시작:', {
      filename: file.name,
      size: `${(file.size / 1024).toFixed(1)}KB`,
      path: storagePath,
    });

    const snapshot = await uploadBytes(storageRef, file, {
      contentType: file.type,
      customMetadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
      },
    });

    // ========================================
    // 6. 다운로드 URL 가져오기
    // ========================================
    const downloadUrl = await getDownloadURL(snapshot.ref);

    console.log('[uploadImage] 업로드 완료:', {
      url: downloadUrl,
      path: storagePath,
    });

    return {
      success: true,
      url: downloadUrl,
      path: storagePath,
      filename: file.name,
    };
  } catch (error) {
    console.error('[uploadImage] 업로드 실패:', error);

    // Firebase Storage 에러 처리
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';

    // 일반적인 에러 메시지로 변환
    if (errorMessage.includes('storage/unauthorized')) {
      return {
        success: false,
        error: '이미지 업로드 권한이 없습니다. 로그인 상태를 확인해주세요.',
      };
    }

    if (errorMessage.includes('storage/canceled')) {
      return {
        success: false,
        error: '업로드가 취소되었습니다.',
      };
    }

    if (errorMessage.includes('storage/quota-exceeded')) {
      return {
        success: false,
        error: '저장 공간이 부족합니다. 관리자에게 문의해주세요.',
      };
    }

    return {
      success: false,
      error: `이미지 업로드 중 오류가 발생했습니다: ${errorMessage}`,
    };
  }
}

/**
 * 이미지 파일 검증만 수행
 *
 * 실제 업로드 없이 파일이 유효한지만 확인합니다.
 * 업로드 전 사전 검증에 사용됩니다.
 *
 * @param file - 검증할 File 객체
 * @returns 유효성 검사 결과
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // 타입 검증
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: '지원하지 않는 이미지 형식입니다.',
    };
  }

  // 크기 검증
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: '파일 크기가 5MB를 초과합니다.',
    };
  }

  return { valid: true };
}

/**
 * 허용되는 이미지 타입 목록 반환
 *
 * input[type=file]의 accept 속성에 사용
 */
export function getAllowedImageTypes(): string {
  return ALLOWED_MIME_TYPES.join(',');
}

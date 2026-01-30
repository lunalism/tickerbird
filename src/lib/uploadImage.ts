/**
 * 이미지 업로드 유틸리티
 *
 * Next.js API Route를 통해 이미지를 서버로 전송하고,
 * 서버에서 Firebase Storage에 업로드합니다.
 *
 * ============================================================
 * 서버사이드 업로드 방식:
 * ============================================================
 * 클라이언트에서 Firebase Storage로 직접 업로드하면 CORS 에러가 발생합니다.
 * 이를 우회하기 위해 서버(API Route)를 통해 업로드합니다.
 *
 * 흐름:
 * 1. 클라이언트: 이미지 파일 → API Route (/api/upload)
 * 2. 서버: API Route → Firebase Storage (Admin SDK)
 * 3. 서버: 업로드 완료 → 공개 URL 반환
 * 4. 클라이언트: URL을 에디터에 삽입
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

// ==================== 메인 함수 ====================

/**
 * 이미지 파일 업로드
 *
 * API Route를 통해 서버에서 Firebase Storage로 업로드합니다.
 * 클라이언트에서 직접 업로드하지 않아 CORS 문제가 없습니다.
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
    // 1. 클라이언트 측 사전 검증
    // ========================================

    // 파일 타입 검증
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return {
        success: false,
        error: `지원하지 않는 이미지 형식입니다. (지원: JPG, PNG, GIF, WebP, SVG)`,
      };
    }

    // 파일 크기 검증
    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / 1024 / 1024).toFixed(1);
      return {
        success: false,
        error: `파일 크기가 너무 큽니다. (${sizeMB}MB / 최대 5MB)`,
      };
    }

    // ========================================
    // 2. FormData 생성
    // ========================================
    const formData = new FormData();
    formData.append('file', file);
    formData.append('contentType', contentType);

    console.log('[uploadImage] 업로드 시작:', {
      filename: file.name,
      size: `${(file.size / 1024).toFixed(1)}KB`,
      type: file.type,
      contentType,
    });

    // ========================================
    // 3. API Route 호출
    // ========================================
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    // ========================================
    // 4. 응답 처리
    // ========================================
    const result = await response.json();

    if (!response.ok) {
      console.error('[uploadImage] 서버 에러:', result);
      return {
        success: false,
        error: result.error || `서버 오류 (${response.status})`,
      };
    }

    if (result.success) {
      console.log('[uploadImage] 업로드 완료:', {
        url: result.url,
        path: result.path,
      });
      return {
        success: true,
        url: result.url,
        path: result.path,
        filename: result.filename,
      };
    } else {
      return {
        success: false,
        error: result.error || '알 수 없는 오류가 발생했습니다.',
      };
    }
  } catch (error) {
    console.error('[uploadImage] 업로드 실패:', error);

    // 네트워크 에러 처리
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        success: false,
        error: '네트워크 연결을 확인해주세요.',
      };
    }

    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
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

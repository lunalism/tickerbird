/**
 * 이미지 업로드 API Route
 *
 * 클라이언트에서 이미지를 받아 Firebase Storage에 업로드합니다.
 * 서버사이드에서 처리하므로 CORS 문제가 발생하지 않습니다.
 *
 * ============================================================
 * 엔드포인트:
 * ============================================================
 * POST /api/upload
 *
 * ============================================================
 * 요청 형식:
 * ============================================================
 * Content-Type: multipart/form-data
 * Body:
 *   - file: 이미지 파일 (필수)
 *   - contentType: 'announcements' | 'faq' | 'general' (선택, 기본: 'general')
 *
 * ============================================================
 * 응답 형식:
 * ============================================================
 * 성공 (200):
 * {
 *   success: true,
 *   url: "https://storage.googleapis.com/...",
 *   path: "content/announcements/images/...",
 *   filename: "original-filename.jpg"
 * }
 *
 * 실패 (400/500):
 * {
 *   success: false,
 *   error: "에러 메시지"
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminStorage } from '@/lib/firebaseAdmin';

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

/** 컨텐츠 타입 */
type ContentType = 'announcements' | 'faq' | 'general';

// ==================== 유틸 함수 ====================

/**
 * 파일명에서 안전한 문자만 추출
 */
function sanitizeFilename(filename: string): string {
  const lastDotIndex = filename.lastIndexOf('.');
  const name = lastDotIndex > 0 ? filename.slice(0, lastDotIndex) : filename;
  const ext = lastDotIndex > 0 ? filename.slice(lastDotIndex) : '';

  const safeName = name
    .replace(/[^a-zA-Z0-9가-힣_-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 50);

  return `${safeName}${ext.toLowerCase()}`;
}

/**
 * 고유한 파일 경로 생성
 */
function generateUniquePath(contentType: ContentType, filename: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const safeFilename = sanitizeFilename(filename);

  return `content/${contentType}/images/${timestamp}_${random}_${safeFilename}`;
}

/**
 * MIME 타입에서 확장자 추출
 */
function getExtensionFromMimeType(mimeType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/svg+xml': '.svg',
  };
  return map[mimeType] || '.jpg';
}

// ==================== API Handler ====================

/**
 * POST /api/upload
 *
 * 이미지 파일을 Firebase Storage에 업로드합니다.
 */
export async function POST(request: NextRequest) {
  try {
    // ========================================
    // 1. Firebase Admin Storage 확인
    // ========================================
    const storage = getAdminStorage();
    if (!storage) {
      console.error('[API/upload] Firebase Admin Storage를 초기화할 수 없습니다.');
      return NextResponse.json(
        {
          success: false,
          error: 'Firebase Storage 연결에 실패했습니다. 관리자에게 문의해주세요.',
        },
        { status: 500 }
      );
    }

    // ========================================
    // 2. FormData 파싱
    // ========================================
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const contentType = (formData.get('contentType') as ContentType) || 'general';

    // 파일 존재 확인
    if (!file) {
      return NextResponse.json(
        { success: false, error: '파일이 첨부되지 않았습니다.' },
        { status: 400 }
      );
    }

    // ========================================
    // 3. 파일 검증
    // ========================================

    // MIME 타입 검증
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: `지원하지 않는 이미지 형식입니다. (지원: JPG, PNG, GIF, WebP, SVG)`,
        },
        { status: 400 }
      );
    }

    // 파일 크기 검증
    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / 1024 / 1024).toFixed(1);
      return NextResponse.json(
        {
          success: false,
          error: `파일 크기가 너무 큽니다. (${sizeMB}MB / 최대 5MB)`,
        },
        { status: 400 }
      );
    }

    // ========================================
    // 4. 파일 경로 생성
    // ========================================
    const originalFilename = file.name || `image${getExtensionFromMimeType(file.type)}`;
    const storagePath = generateUniquePath(contentType, originalFilename);

    console.log('[API/upload] 업로드 시작:', {
      filename: originalFilename,
      size: `${(file.size / 1024).toFixed(1)}KB`,
      type: file.type,
      path: storagePath,
    });

    // ========================================
    // 5. Firebase Storage에 업로드
    // ========================================
    const bucket = storage.bucket();
    const fileRef = bucket.file(storagePath);

    // File을 Buffer로 변환
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 업로드 실행
    await fileRef.save(buffer, {
      metadata: {
        contentType: file.type,
        metadata: {
          originalName: originalFilename,
          uploadedAt: new Date().toISOString(),
        },
      },
    });

    // 파일을 공개적으로 접근 가능하게 설정
    await fileRef.makePublic();

    // ========================================
    // 6. 공개 URL 생성
    // ========================================
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;

    console.log('[API/upload] 업로드 완료:', {
      url: publicUrl,
      path: storagePath,
    });

    // ========================================
    // 7. 성공 응답
    // ========================================
    return NextResponse.json({
      success: true,
      url: publicUrl,
      path: storagePath,
      filename: originalFilename,
    });
  } catch (error) {
    console.error('[API/upload] 업로드 오류:', error);

    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';

    return NextResponse.json(
      {
        success: false,
        error: `이미지 업로드 중 오류가 발생했습니다: ${errorMessage}`,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/upload
 *
 * API 상태 확인용 (헬스 체크)
 */
export async function GET() {
  const storage = getAdminStorage();

  return NextResponse.json({
    status: 'ok',
    storageAvailable: storage !== null,
  });
}

/**
 * 이미지 업로드 API Route (Cloudinary)
 *
 * 클라이언트에서 이미지를 받아 Cloudinary에 업로드합니다.
 * 서버사이드에서 처리하므로 CORS 문제가 발생하지 않습니다.
 *
 * ============================================================
 * Cloudinary 무료 플랜:
 * ============================================================
 * - 25GB 저장 공간
 * - 25GB 대역폭/월
 * - 이미지 자동 최적화
 * - CDN 제공
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
 *   url: "https://res.cloudinary.com/...",
 *   path: "alphaboard/announcements/...",
 *   filename: "original-filename.jpg"
 * }
 *
 * 실패 (400/500):
 * {
 *   success: false,
 *   error: "에러 메시지"
 * }
 */

import { v2 as cloudinary } from 'cloudinary';
import { NextRequest, NextResponse } from 'next/server';

// ==================== Cloudinary 설정 ====================

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

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

// ==================== API Handler ====================

/**
 * POST /api/upload
 *
 * 이미지 파일을 Cloudinary에 업로드합니다.
 */
export async function POST(request: NextRequest) {
  try {
    // ========================================
    // 1. Cloudinary 설정 확인
    // ========================================
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY) {
      console.error('[API/upload] Cloudinary 환경 변수가 설정되지 않았습니다.');
      return NextResponse.json(
        {
          success: false,
          error: 'Cloudinary 설정이 없습니다. 관리자에게 문의해주세요.',
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
    // 4. Cloudinary 폴더 경로 설정
    // ========================================
    const folder = `alphaboard/${contentType}`;
    const originalFilename = file.name || 'image';

    console.log('[API/upload] 업로드 시작:', {
      filename: originalFilename,
      size: `${(file.size / 1024).toFixed(1)}KB`,
      type: file.type,
      folder,
    });

    // ========================================
    // 5. File을 base64로 변환
    // ========================================
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = `data:${file.type};base64,${buffer.toString('base64')}`;

    // ========================================
    // 6. Cloudinary에 업로드
    // ========================================
    const result = await cloudinary.uploader.upload(base64, {
      folder,
      // 파일명에서 확장자 제거하고 public_id로 사용
      public_id: `${Date.now()}_${originalFilename.replace(/\.[^/.]+$/, '')}`,
      // 이미지 자동 최적화
      transformation: [
        { quality: 'auto' },
        { fetch_format: 'auto' },
      ],
    });

    console.log('[API/upload] 업로드 완료:', {
      url: result.secure_url,
      public_id: result.public_id,
    });

    // ========================================
    // 7. 성공 응답
    // ========================================
    return NextResponse.json({
      success: true,
      url: result.secure_url,
      path: result.public_id,
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
  const isConfigured = !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );

  return NextResponse.json({
    status: 'ok',
    provider: 'cloudinary',
    configured: isConfigured,
  });
}

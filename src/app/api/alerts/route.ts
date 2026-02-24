/**
 * 가격 알림 API 라우트 (Firestore Admin SDK)
 *
 * 가격 알림 목록 조회 및 새 알림 추가 API
 * 서버사이드에서 실행되므로 Admin SDK를 사용하여 Firestore에 접근합니다.
 *
 * 엔드포인트:
 * - GET /api/alerts: 내 알림 목록 조회
 * - POST /api/alerts: 새 알림 추가
 *
 * 인증:
 * - x-user-id 헤더로 사용자 인증
 *
 * Firestore 구조:
 * price_alerts/{alertId}
 *   - userId: string
 *   - ticker: string
 *   - market: string (KR/US)
 *   - stockName: string
 *   - targetPrice: number
 *   - direction: string (above/below)
 *   - isActive: boolean
 *   - isTriggered: boolean
 *   - createdAt: timestamp
 *   - triggeredAt: timestamp | null
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import {
  PriceAlert,
  CreateAlertRequest,
  AlertMarket,
  AlertDirection,
} from '@/types/priceAlert';

/**
 * Firestore Admin 문서를 PriceAlert로 변환
 *
 * Admin SDK의 Timestamp는 클라이언트 SDK와 다르므로 별도 변환 필요
 */
function docToAlert(id: string, data: FirebaseFirestore.DocumentData): PriceAlert {
  return {
    id,
    userId: data.userId,
    ticker: data.ticker,
    market: data.market as AlertMarket,
    stockName: data.stockName,
    targetPrice: data.targetPrice,
    direction: data.direction as AlertDirection,
    isActive: data.isActive,
    isTriggered: data.isTriggered,
    // Admin SDK Timestamp → ISO 문자열 변환
    createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    triggeredAt: data.triggeredAt?.toDate?.()?.toISOString() || undefined,
  };
}

/**
 * GET /api/alerts
 *
 * 현재 로그인한 사용자의 가격 알림 목록 조회
 * Admin SDK를 사용하여 보안 규칙을 우회 (서버사이드 권한)
 *
 * @returns 알림 목록 또는 에러
 */
export async function GET(request: NextRequest) {
  try {
    // 요청 헤더에서 사용자 ID 가져오기
    const userId = request.headers.get('x-user-id');

    // 인증 체크
    if (!userId) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다' },
        { status: 401 }
      );
    }

    // Admin SDK로 Firestore 조회 (보안 규칙 우회)
    const db = getAdminDb();
    const snapshot = await db
      .collection('price_alerts')
      .where('userId', '==', userId)
      .get();

    // 문서를 PriceAlert로 변환
    const alerts: PriceAlert[] = snapshot.docs.map((doc) =>
      docToAlert(doc.id, doc.data())
    );

    // 최신순 정렬 (createdAt 내림차순)
    alerts.sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      return bTime - aTime;
    });

    return NextResponse.json({ success: true, data: alerts });
  } catch (error) {
    // 상세 에러 로깅
    console.error('[Alerts API] GET 알림 조회 에러:', error);

    return NextResponse.json(
      {
        success: false,
        error: '서버 에러가 발생했습니다',
        // 개발 환경에서만 상세 에러 반환
        ...(process.env.NODE_ENV === 'development' && {
          details: error instanceof Error ? error.message : String(error),
        }),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/alerts
 *
 * 새 가격 알림 추가
 * Admin SDK를 사용하여 Firestore에 문서 생성
 *
 * @param request 요청 객체 (본문에 알림 정보 포함)
 * @returns 생성된 알림 또는 에러
 */
export async function POST(request: NextRequest) {
  try {
    // 요청 헤더에서 사용자 ID 가져오기
    const userId = request.headers.get('x-user-id');

    // 인증 체크
    if (!userId) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다' },
        { status: 401 }
      );
    }

    // 요청 본문 파싱
    const body: CreateAlertRequest = await request.json();

    // 필수 필드 검증
    if (!body.ticker || !body.market || !body.stockName || !body.targetPrice || !body.direction) {
      return NextResponse.json(
        { success: false, error: '필수 항목이 누락되었습니다' },
        { status: 400 }
      );
    }

    // 시장 유효성 검증
    if (!['KR', 'US'].includes(body.market)) {
      return NextResponse.json(
        { success: false, error: '잘못된 시장 구분입니다' },
        { status: 400 }
      );
    }

    // 방향 유효성 검증
    if (!['above', 'below'].includes(body.direction)) {
      return NextResponse.json(
        { success: false, error: '잘못된 알림 방향입니다' },
        { status: 400 }
      );
    }

    // 목표가 유효성 검증
    if (body.targetPrice <= 0) {
      return NextResponse.json(
        { success: false, error: '목표가는 0보다 커야 합니다' },
        { status: 400 }
      );
    }

    // Admin SDK로 Firestore에 문서 추가
    const db = getAdminDb();
    const alertData = {
      userId,
      ticker: body.ticker,
      market: body.market,
      stockName: body.stockName,
      targetPrice: body.targetPrice,
      direction: body.direction,
      isActive: true,
      isTriggered: false,
      createdAt: new Date(),
      triggeredAt: null,
    };

    const docRef = await db.collection('price_alerts').add(alertData);

    // 생성된 알림 반환
    const createdAlert: PriceAlert = {
      id: docRef.id,
      userId,
      ticker: body.ticker,
      market: body.market as AlertMarket,
      stockName: body.stockName,
      targetPrice: body.targetPrice,
      direction: body.direction as AlertDirection,
      isActive: true,
      isTriggered: false,
      createdAt: new Date().toISOString(),
      triggeredAt: undefined,
    };

    return NextResponse.json({ success: true, data: createdAlert }, { status: 201 });
  } catch (error) {
    console.error('[Alerts API] POST 알림 추가 에러:', error);
    return NextResponse.json(
      { success: false, error: '서버 에러가 발생했습니다' },
      { status: 500 }
    );
  }
}

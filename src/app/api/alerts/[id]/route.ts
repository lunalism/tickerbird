/**
 * 개별 가격 알림 API 라우트 (Firestore Admin SDK)
 *
 * 특정 알림 수정 및 삭제 API
 * 서버사이드에서 실행되므로 Admin SDK를 사용하여 Firestore에 접근합니다.
 *
 * 엔드포인트:
 * - PATCH /api/alerts/[id]: 알림 수정 (활성화/비활성화, 목표가 변경)
 * - DELETE /api/alerts/[id]: 알림 삭제
 *
 * 인증:
 * - x-user-id 헤더로 사용자 인증
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import {
  PriceAlert,
  UpdateAlertRequest,
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
 * PATCH /api/alerts/[id]
 *
 * 특정 알림 수정
 * - 활성화/비활성화 토글
 * - 목표가 변경
 * - 알림 방향 변경
 *
 * @param request 요청 객체
 * @param params 경로 파라미터 (id: 알림 ID)
 * @returns 수정된 알림 또는 에러
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 경로 파라미터에서 알림 ID 추출
    const { id } = await params;

    // 요청 헤더에서 사용자 ID 가져오기
    const userId = request.headers.get('x-user-id');

    // 인증 체크
    if (!userId) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다' },
        { status: 401 }
      );
    }

    // Admin SDK로 알림 조회
    const db = getAdminDb();
    const alertRef = db.collection('price_alerts').doc(id);
    const alertDoc = await alertRef.get();

    if (!alertDoc.exists) {
      return NextResponse.json(
        { success: false, error: '알림을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    const alertData = alertDoc.data()!;

    // 본인 확인
    if (alertData.userId !== userId) {
      return NextResponse.json(
        { success: false, error: '알림 수정 권한이 없습니다' },
        { status: 403 }
      );
    }

    // 요청 본문 파싱
    const body: UpdateAlertRequest = await request.json();

    // 수정할 내용이 없는 경우
    if (
      body.isActive === undefined &&
      body.targetPrice === undefined &&
      body.direction === undefined
    ) {
      return NextResponse.json(
        { success: false, error: '수정할 내용이 없습니다' },
        { status: 400 }
      );
    }

    // 목표가 유효성 검증
    if (body.targetPrice !== undefined && body.targetPrice <= 0) {
      return NextResponse.json(
        { success: false, error: '목표가는 0보다 커야 합니다' },
        { status: 400 }
      );
    }

    // 방향 유효성 검증
    if (body.direction !== undefined && !['above', 'below'].includes(body.direction)) {
      return NextResponse.json(
        { success: false, error: '잘못된 알림 방향입니다' },
        { status: 400 }
      );
    }

    // 업데이트 데이터 구성
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (body.isActive !== undefined) {
      updateData.isActive = body.isActive;
    }
    if (body.targetPrice !== undefined) {
      updateData.targetPrice = body.targetPrice;
      // 목표가 변경 시 트리거 상태 초기화
      // 목표가가 바뀌면 다시 조건을 체크해야 하므로 isTriggered를 false로 리셋
      updateData.isTriggered = false;
      updateData.triggeredAt = null;
    }
    if (body.direction !== undefined) {
      updateData.direction = body.direction;
      // 방향 변경 시에도 트리거 상태 초기화
      // 이상→이하 또는 이하→이상으로 바뀌면 조건이 달라지므로 리셋
      updateData.isTriggered = false;
      updateData.triggeredAt = null;
    }

    // Admin SDK로 Firestore 문서 업데이트
    await alertRef.update(updateData);

    // 업데이트된 알림 조회
    const updatedDoc = await alertRef.get();

    if (!updatedDoc.exists) {
      return NextResponse.json(
        { success: false, error: '알림 수정에 실패했습니다' },
        { status: 500 }
      );
    }

    // 수정된 알림 반환
    const priceAlert = docToAlert(updatedDoc.id, updatedDoc.data()!);
    return NextResponse.json({ success: true, data: priceAlert });
  } catch (error) {
    console.error('[Alerts API] PATCH 알림 수정 에러:', error);
    return NextResponse.json(
      { success: false, error: '서버 에러가 발생했습니다' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/alerts/[id]
 *
 * 특정 알림 삭제
 *
 * @param request 요청 객체
 * @param params 경로 파라미터 (id: 알림 ID)
 * @returns 성공 여부 또는 에러
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 경로 파라미터에서 알림 ID 추출
    const { id } = await params;

    // 요청 헤더에서 사용자 ID 가져오기
    const userId = request.headers.get('x-user-id');

    // 인증 체크
    if (!userId) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다' },
        { status: 401 }
      );
    }

    // Admin SDK로 알림 조회
    const db = getAdminDb();
    const alertRef = db.collection('price_alerts').doc(id);
    const alertDoc = await alertRef.get();

    if (!alertDoc.exists) {
      return NextResponse.json(
        { success: false, error: '알림을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    const alertData = alertDoc.data()!;

    // 본인 확인
    if (alertData.userId !== userId) {
      return NextResponse.json(
        { success: false, error: '알림 삭제 권한이 없습니다' },
        { status: 403 }
      );
    }

    // Admin SDK로 Firestore 문서 삭제
    await alertRef.delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Alerts API] DELETE 알림 삭제 에러:', error);
    return NextResponse.json(
      { success: false, error: '서버 에러가 발생했습니다' },
      { status: 500 }
    );
  }
}

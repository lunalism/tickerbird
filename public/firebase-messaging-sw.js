/**
 * Firebase Cloud Messaging 서비스 워커
 *
 * 백그라운드에서 푸시 알림을 수신하고 표시합니다.
 * 사이트가 닫혀있거나 백그라운드에 있을 때도 알림을 받을 수 있습니다.
 *
 * ============================================================
 * 동작 방식:
 * ============================================================
 * 1. 브라우저가 FCM 서버에서 푸시 메시지를 수신
 * 2. 서비스 워커가 onBackgroundMessage 이벤트 수신
 * 3. 알림 표시 (showNotification)
 * 4. 사용자가 알림 클릭 시 해당 페이지로 이동
 *
 * ============================================================
 * 주의사항:
 * ============================================================
 * - 이 파일은 public/ 폴더에 위치해야 합니다
 * - Firebase SDK 버전은 앱과 동일하게 유지해야 합니다
 * - VAPID 키가 올바르게 설정되어야 합니다
 */

// Firebase SDK (compat 버전 - 서비스 워커 호환)
// 앱의 Firebase 버전과 동일하게 유지 (현재 12.x)
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

/**
 * Firebase 설정
 *
 * 환경변수를 사용할 수 없으므로 직접 값을 입력해야 합니다.
 * 보안 참고: 이 값들은 공개 키이므로 노출되어도 괜찮습니다.
 * (비밀 키가 아닌 클라이언트 식별용 공개 키)
 */
firebase.initializeApp({
  apiKey: 'AIzaSyDZ-uOJfEG8HCQNZBPoo5RXTx_csFw-EHw',
  // 커스텀 도메인 사용 (Google 로그인 시 tickerbird.me 표시)
  authDomain: 'tickerbird.me',
  projectId: 'alphaboard-web',
  storageBucket: 'alphaboard-web.firebasestorage.app',
  messagingSenderId: '716830414217',
  appId: '1:716830414217:web:59feaf50122fbd1a51fd58',
});

// Firebase Messaging 인스턴스
const messaging = firebase.messaging();

/**
 * 백그라운드 메시지 핸들러
 *
 * 앱이 백그라운드에 있거나 닫혀있을 때 호출됩니다.
 * 포그라운드(앱이 열려있을 때)는 앱 내에서 onMessage로 처리합니다.
 */
messaging.onBackgroundMessage((payload) => {
  console.log('[FCM SW] 백그라운드 메시지 수신:', payload);

  // 알림 데이터 추출
  const notificationTitle = payload.notification?.title || '📈 Tickerbird';
  const notificationOptions = {
    // 알림 본문
    body: payload.notification?.body || '새로운 알림이 있습니다.',
    // 알림 아이콘 (PWA 아이콘 사용)
    icon: '/icons/icon-192x192.png',
    // 알림 배지 (작은 아이콘)
    badge: '/icons/icon-72x72.png',
    // 커스텀 데이터 (클릭 시 사용)
    data: payload.data || {},
    // 알림 태그 (같은 태그의 알림은 하나로 합침)
    tag: payload.data?.alertId || 'tickerbird-notification',
    // 알림 재등록 여부 (같은 태그의 알림을 다시 표시할지)
    renotify: true,
    // 사용자 상호작용 필요 여부
    requireInteraction: true,
    // 진동 패턴 (밀리초 단위: 진동-멈춤-진동)
    vibrate: [200, 100, 200],
    // 알림 사운드 (기본 사운드 사용)
    silent: false,
  };

  // 알림 표시
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

/**
 * 알림 클릭 핸들러
 *
 * 사용자가 푸시 알림을 클릭했을 때 호출됩니다.
 * 해당 종목 상세 페이지로 이동합니다.
 */
self.addEventListener('notificationclick', (event) => {
  console.log('[FCM SW] 알림 클릭:', event);

  // 알림 닫기
  event.notification.close();

  // 클릭 시 이동할 URL 결정
  const data = event.notification.data || {};
  let targetUrl = '/alerts'; // 기본값: 알림 목록 페이지

  // 종목 정보가 있으면 종목 상세 페이지로 이동
  if (data.ticker && data.market) {
    const market = data.market === 'KR' ? 'kr' : 'us';
    targetUrl = `/market/${data.ticker}?market=${market}`;
  }

  // URL 열기 (이미 열려있는 탭이 있으면 포커스, 없으면 새 탭)
  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // 이미 열려있는 Tickerbird 탭 찾기
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            // 기존 탭으로 이동
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        // 열려있는 탭이 없으면 새 탭 열기
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});

/**
 * 서비스 워커 설치 이벤트
 *
 * 서비스 워커가 처음 설치될 때 호출됩니다.
 */
self.addEventListener('install', (event) => {
  console.log('[FCM SW] 설치됨');
  // 즉시 활성화 (대기 없이)
  self.skipWaiting();
});

/**
 * 서비스 워커 활성화 이벤트
 *
 * 서비스 워커가 활성화될 때 호출됩니다.
 */
self.addEventListener('activate', (event) => {
  console.log('[FCM SW] 활성화됨');
  // 모든 클라이언트 제어권 획득
  event.waitUntil(clients.claim());
});

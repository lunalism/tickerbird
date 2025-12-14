import { Notification, NotificationFilter } from '@/types';

export const notificationFilters: { id: NotificationFilter; label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'watchlist', label: '관심종목' },
  { id: 'news', label: '뉴스' },
  { id: 'community', label: '커뮤니티' },
];

export const dummyNotifications: Notification[] = [
  {
    id: '1',
    type: 'watchlist',
    title: '삼성전자가 3% 상승했습니다',
    createdAt: '5분 전',
    isRead: false,
  },
  {
    id: '2',
    type: 'community',
    title: '내 글에 새 댓글이 달렸습니다',
    createdAt: '15분 전',
    isRead: false,
  },
  {
    id: '3',
    type: 'news',
    title: '연준 금리 동결 속보',
    createdAt: '30분 전',
    isRead: false,
  },
  {
    id: '4',
    type: 'watchlist',
    title: 'Tesla가 5% 하락했습니다',
    createdAt: '1시간 전',
    isRead: true,
  },
  {
    id: '5',
    type: 'community',
    title: '투자의신님이 내 댓글에 좋아요를 눌렀습니다',
    createdAt: '2시간 전',
    isRead: true,
  },
  {
    id: '6',
    type: 'news',
    title: '미국 CPI 발표 예정',
    createdAt: '3시간 전',
    isRead: true,
  },
  {
    id: '7',
    type: 'watchlist',
    title: 'NVIDIA가 목표가에 도달했습니다',
    createdAt: '5시간 전',
    isRead: true,
  },
  {
    id: '8',
    type: 'community',
    title: '내 게시글이 인기글에 선정되었습니다',
    createdAt: '6시간 전',
    isRead: true,
  },
  {
    id: '9',
    type: 'news',
    title: '한국은행 기준금리 결정 발표',
    createdAt: '1일 전',
    isRead: true,
  },
  {
    id: '10',
    type: 'watchlist',
    title: 'Apple이 2% 상승했습니다',
    createdAt: '1일 전',
    isRead: true,
  },
];

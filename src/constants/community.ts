/**
 * 커뮤니티 상수 및 목업 데이터
 *
 * 타임라인 피드 스타일을 위한 데이터입니다.
 */

import {
  CommunityTab,
  FeedPost,
  HotPost,
  DiscussionStock,
  ActiveUser,
  Post,
} from '@/types/community';

/**
 * 카테고리 탭 목록
 * [전체] [팔로잉] [종목토론] [투자전략] [Q&A]
 */
export const communityTabs: CommunityTab[] = [
  { id: 'all', label: '전체' },
  { id: 'following', label: '팔로잉' },
  { id: 'stock', label: '종목토론' },
  { id: 'strategy', label: '투자전략' },
  { id: 'qna', label: 'Q&A' },
];

/**
 * 피드 포스트 목업 데이터 (트위터/X 스타일)
 */
export const feedPosts: FeedPost[] = [
  {
    id: 1,
    author: '투자의신',
    username: 'investor_god',
    authorAvatar: '🧙',
    content:
      '$NVDA 어닝 발표 후 급락했지만, 장기적으로 AI 수요는 계속될 거라 봅니다. 지금이 매수 기회일 수도? 🤔 #AI투자 #엔비디아',
    hashtags: ['AI투자', '엔비디아'],
    stockTags: [
      { ticker: 'NVDA', name: '엔비디아', price: 134.25, changePercent: -2.87 },
    ],
    category: 'stock',
    createdAt: '5분 전',
    likes: 89,
    comments: 47,
    reposts: 12,
    liked: false,
    bookmarked: false,
    reposted: false,
    isHot: true,
  },
  {
    id: 2,
    author: '매크로분석가',
    username: 'macro_analyst',
    authorAvatar: '📊',
    content:
      '12월 FOMC 결과 분석: 금리 동결은 예상대로. 하지만 내년 금리 인하 횟수 전망이 핵심입니다. 시장은 3회 인하를 기대 중인데, Fed는 2회만 시사했네요. #FOMC #금리 #매크로',
    hashtags: ['FOMC', '금리', '매크로'],
    stockTags: [],
    category: 'strategy',
    createdAt: '25분 전',
    likes: 156,
    comments: 83,
    reposts: 45,
    liked: true,
    bookmarked: true,
    reposted: false,
    isHot: true,
  },
  {
    id: 3,
    author: 'TeslaFan',
    username: 'tesla_fan_kr',
    authorAvatar: '🚗',
    content:
      '$TSLA FSD v13 업데이트 소식! 완전자율주행에 한 걸음 더 가까워졌습니다. 이번 업데이트로 주가 반등 기대해봅니다 🚀 #테슬라 #FSD #자율주행',
    hashtags: ['테슬라', 'FSD', '자율주행'],
    stockTags: [
      { ticker: 'TSLA', name: '테슬라', price: 421.06, changePercent: 3.24 },
    ],
    category: 'stock',
    createdAt: '42분 전',
    likes: 62,
    comments: 31,
    reposts: 8,
    liked: false,
    bookmarked: false,
    reposted: false,
    isHot: true,
  },
  {
    id: 4,
    author: '배당왕',
    username: 'dividend_king',
    authorAvatar: '👑',
    content:
      '2024년 배당주 포트폴리오 결산! 월 배당 100만원 달성했습니다 🎉\n\n구성: $O (리얼티인컴) 30%, $SCHD 25%, 삼성전자우 20%, 맥쿼리인프라 15%, 기타 10%\n\n#배당투자 #월배당 #패시브인컴',
    hashtags: ['배당투자', '월배당', '패시브인컴'],
    stockTags: [
      { ticker: 'O', name: '리얼티인컴', price: 56.78, changePercent: 0.45 },
    ],
    category: 'strategy',
    createdAt: '1시간 전',
    likes: 234,
    comments: 98,
    reposts: 67,
    liked: false,
    bookmarked: true,
    reposted: false,
    isHot: true,
  },
  {
    id: 5,
    author: '주린이',
    username: 'stock_newbie',
    authorAvatar: '🐣',
    content:
      '미국 주식 양도소득세 계산이 너무 어렵네요 😭 연간 250만원 공제 후 22% 맞나요? 환율은 어떻게 적용되는지도 헷갈려요. 고수님들 도움 부탁드립니다! #주식세금 #양도소득세 #미국주식',
    hashtags: ['주식세금', '양도소득세', '미국주식'],
    stockTags: [],
    category: 'qna',
    createdAt: '1시간 전',
    likes: 12,
    comments: 24,
    reposts: 2,
    liked: false,
    bookmarked: false,
    reposted: false,
    isHot: false,
  },
  {
    id: 6,
    author: 'AI투자자',
    username: 'ai_investor',
    authorAvatar: '🤖',
    content:
      '$MSFT와 $GOOGL AI 경쟁 심화 중. Copilot vs Gemini, 누가 이길까요?\n\n개인적으로는 엔터프라이즈 시장에서 MS가 유리하다고 봅니다. Office 365 통합이 킬러앱이에요. #AI #마이크로소프트 #구글',
    hashtags: ['AI', '마이크로소프트', '구글'],
    stockTags: [
      { ticker: 'MSFT', name: '마이크로소프트', price: 438.92, changePercent: 1.23 },
      { ticker: 'GOOGL', name: '구글', price: 192.45, changePercent: -0.87 },
    ],
    category: 'stock',
    createdAt: '2시간 전',
    likes: 78,
    comments: 42,
    reposts: 15,
    liked: false,
    bookmarked: false,
    reposted: false,
    isHot: false,
  },
  {
    id: 7,
    author: '환율전문가',
    username: 'fx_expert',
    authorAvatar: '💱',
    content:
      '원/달러 1,450원 돌파 🚨 수출주에는 호재, 수입주에는 악재. 환헤지 ETF 비중 조절 필요한 시점입니다.\n\n삼성전자, 현대차 등 수출 비중 높은 종목 주목! #환율 #달러 #수출주',
    hashtags: ['환율', '달러', '수출주'],
    stockTags: [],
    category: 'strategy',
    createdAt: '3시간 전',
    likes: 45,
    comments: 28,
    reposts: 9,
    liked: false,
    bookmarked: false,
    reposted: false,
    isHot: false,
  },
  {
    id: 8,
    author: '섹터분석가',
    username: 'sector_analyst',
    authorAvatar: '🔍',
    content:
      '2025년 유망 섹터 TOP 5 정리 📈\n\n1. AI 반도체 (NVDA, AMD)\n2. 우주항공 (LMT, RTX)\n3. 바이오테크 (신약 파이프라인)\n4. 클린에너지 (ENPH, FSLR)\n5. 사이버보안 (CRWD, PANW)\n\n#2025전망 #섹터분석',
    hashtags: ['2025전망', '섹터분석'],
    stockTags: [],
    category: 'strategy',
    createdAt: '4시간 전',
    likes: 189,
    comments: 76,
    reposts: 52,
    liked: true,
    bookmarked: false,
    reposted: true,
    isHot: true,
  },
  {
    id: 9,
    author: '애플덕후',
    username: 'apple_lover',
    authorAvatar: '🍎',
    content:
      '$AAPL 비전프로 2세대 루머 정리!\n\n• 가격 2,000달러대로 인하 예상\n• 무게 30% 감소\n• 2025년 하반기 출시 예정\n\n대중화 되면 주가에 큰 호재가 될 듯 🚀 #애플 #비전프로 #XR',
    hashtags: ['애플', '비전프로', 'XR'],
    stockTags: [
      { ticker: 'AAPL', name: '애플', price: 248.13, changePercent: 0.92 },
    ],
    category: 'stock',
    createdAt: '5시간 전',
    likes: 67,
    comments: 38,
    reposts: 11,
    liked: false,
    bookmarked: false,
    reposted: false,
    isHot: false,
  },
  {
    id: 10,
    author: '절세고민',
    username: 'tax_saver',
    authorAvatar: '💰',
    content:
      'ISA 계좌 vs 연금저축 vs IRP 뭐가 더 유리한가요? 🤔\n\n각각 장단점이 있는 것 같은데, 30대 직장인 기준으로 추천 부탁드립니다. 연봉 5천 정도입니다. #절세 #ISA #연금저축',
    hashtags: ['절세', 'ISA', '연금저축'],
    stockTags: [],
    category: 'qna',
    createdAt: '5시간 전',
    likes: 34,
    comments: 56,
    reposts: 5,
    liked: false,
    bookmarked: false,
    reposted: false,
    isHot: false,
  },
];

/**
 * 인기글 목록
 */
export const hotPosts: HotPost[] = [
  { id: 4, title: '2024년 배당주 포트폴리오 결산!', comments: 98 },
  { id: 2, title: '12월 FOMC 결과 분석', comments: 83 },
  { id: 8, title: '2025년 유망 섹터 TOP 5', comments: 76 },
  { id: 10, title: 'ISA vs 연금저축 vs IRP 비교', comments: 56 },
  { id: 1, title: 'NVDA 어닝 발표 후 매수 기회?', comments: 47 },
];

/**
 * 토론 중인 종목 목록
 */
export const discussionStocks: DiscussionStock[] = [
  { name: '엔비디아', ticker: 'NVDA', mentions: 156 },
  { name: '테슬라', ticker: 'TSLA', mentions: 128 },
  { name: '애플', ticker: 'AAPL', mentions: 96 },
  { name: '마이크로소프트', ticker: 'MSFT', mentions: 84 },
  { name: '삼성전자', ticker: '005930', mentions: 72 },
];

/**
 * 활발한 유저 목록
 */
export const activeUsers: ActiveUser[] = [
  { name: '투자의신', avatar: '🧙', posts: 24 },
  { name: '매크로분석가', avatar: '📊', posts: 18 },
  { name: '배당왕', avatar: '👑', posts: 15 },
  { name: 'AI투자자', avatar: '🤖', posts: 12 },
  { name: '섹터분석가', avatar: '🔍', posts: 10 },
];

/**
 * 카테고리별 배지 색상
 */
export const CATEGORY_BADGE_COLORS: Record<string, string> = {
  '종목토론': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  '투자전략': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  '시장분석': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  '자유게시판': 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  'Q&A': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
};

/**
 * 기존 posts 데이터 (하위 호환성)
 */
export const posts: Post[] = [
  {
    id: 1,
    category: 'stock',
    categoryLabel: '종목토론',
    title: '삼성전자 내년 HBM 생산량 전망 어떻게 보시나요?',
    author: '투자의신',
    createdAt: '10분 전',
    views: 1542,
    likes: 89,
    comments: 47,
    isHot: true,
    stock: { name: '삼성전자', ticker: '005930' },
  },
];

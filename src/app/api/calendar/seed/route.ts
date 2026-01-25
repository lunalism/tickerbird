/**
 * 캘린더 이벤트 시드 API
 *
 * @route POST /api/calendar/seed
 *
 * @description
 * 2026년 경제 캘린더 이벤트를 Firestore에 초기화합니다.
 *
 * 데이터 출처 (2026년 1월 검색 기준):
 * - FOMC: Federal Reserve (federalreserve.gov)
 * - CPI/Employment: Bureau of Labor Statistics (bls.gov)
 * - GDP/PCE: Bureau of Economic Analysis (bea.gov)
 * - BOK: 한국은행 (bok.or.kr)
 * - ECB: European Central Bank (ecb.europa.eu)
 * - BOJ: Bank of Japan (boj.or.jp)
 * - 빅테크 실적: Nasdaq, Wall Street Horizon
 * - 테크 컨퍼런스: 각 공식 웹사이트
 *
 * @example
 * POST /api/calendar/seed
 * { "include2026": true }
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  calendarEventsCollection,
  createDocument,
  queryCollection,
} from '@/lib/firestore';

// ==================== 2026년 경제 이벤트 데이터 ====================
// 웹 검색을 통해 확인된 공식 일정 (2026년 1월 기준)

/**
 * FOMC 회의 일정 2026년
 * 출처: Federal Reserve (federalreserve.gov/monetarypolicy/fomccalendars.htm)
 * * 표시: SEP(경제전망요약) 발표 포함
 * 발표 시간: 회의 둘째날 오후 2시 (동부) = 한국 시간 새벽 4시
 */
const fomcMeetings2026 = [
  { date: '2026-01-28', description: '2026년 첫 FOMC 정례회의 (1월 27-28일)', hasSEP: false },
  { date: '2026-03-18', description: '3월 FOMC 회의 + 경제전망(SEP) 발표 (3월 17-18일)', hasSEP: true },
  { date: '2026-05-06', description: '5월 FOMC 정례회의 (5월 5-6일)', hasSEP: false },
  { date: '2026-06-17', description: '6월 FOMC 회의 + 경제전망(SEP) 발표 (6월 16-17일)', hasSEP: true },
  { date: '2026-07-29', description: '7월 FOMC 정례회의 (7월 28-29일)', hasSEP: false },
  { date: '2026-09-16', description: '9월 FOMC 회의 + 경제전망(SEP) 발표 (9월 15-16일)', hasSEP: true },
  { date: '2026-10-28', description: '10월 FOMC 정례회의 (10월 27-28일)', hasSEP: false },
  { date: '2026-12-09', description: '12월 FOMC 회의 + 경제전망(SEP) 발표 (12월 8-9일)', hasSEP: true },
];

/**
 * 미국 CPI(소비자물가지수) 발표 일정 2026년
 * 출처: Bureau of Labor Statistics (bls.gov/schedule/news_release/cpi.htm)
 * 발표 시간: 오전 8:30 (동부) = 한국 시간 22:30 (같은 날)
 */
const usCPI2026 = [
  { date: '2026-02-11', dataMonth: '1월', description: '2026년 1월 소비자물가지수' },
  { date: '2026-03-11', dataMonth: '2월', description: '2026년 2월 소비자물가지수' },
  { date: '2026-04-14', dataMonth: '3월', description: '2026년 3월 소비자물가지수' },
  { date: '2026-05-12', dataMonth: '4월', description: '2026년 4월 소비자물가지수' },
  { date: '2026-06-10', dataMonth: '5월', description: '2026년 5월 소비자물가지수' },
  { date: '2026-07-15', dataMonth: '6월', description: '2026년 6월 소비자물가지수' },
  { date: '2026-08-12', dataMonth: '7월', description: '2026년 7월 소비자물가지수' },
  { date: '2026-09-10', dataMonth: '8월', description: '2026년 8월 소비자물가지수' },
  { date: '2026-10-13', dataMonth: '9월', description: '2026년 9월 소비자물가지수' },
  { date: '2026-11-12', dataMonth: '10월', description: '2026년 10월 소비자물가지수' },
  { date: '2026-12-10', dataMonth: '11월', description: '2026년 11월 소비자물가지수' },
];

/**
 * 미국 고용보고서 발표 일정 2026년
 * 출처: Bureau of Labor Statistics (bls.gov/schedule/news_release/empsit.htm)
 * 매월 첫째 주 금요일, 발표 시간: 오전 8:30 (동부) = 한국 시간 22:30 (같은 날)
 */
const usEmployment2026 = [
  { date: '2026-01-09', dataMonth: '12월', description: '2025년 12월 고용보고서' },
  { date: '2026-02-06', dataMonth: '1월', description: '2026년 1월 고용보고서 + 연간 벤치마크 수정' },
  { date: '2026-03-06', dataMonth: '2월', description: '2026년 2월 고용보고서' },
  { date: '2026-04-03', dataMonth: '3월', description: '2026년 3월 고용보고서' },
  { date: '2026-05-08', dataMonth: '4월', description: '2026년 4월 고용보고서' },
  { date: '2026-06-05', dataMonth: '5월', description: '2026년 5월 고용보고서' },
  { date: '2026-07-02', dataMonth: '6월', description: '2026년 6월 고용보고서' },
  { date: '2026-08-07', dataMonth: '7월', description: '2026년 7월 고용보고서' },
  { date: '2026-09-04', dataMonth: '8월', description: '2026년 8월 고용보고서' },
  { date: '2026-10-02', dataMonth: '9월', description: '2026년 9월 고용보고서' },
  { date: '2026-11-06', dataMonth: '10월', description: '2026년 10월 고용보고서' },
  { date: '2026-12-04', dataMonth: '11월', description: '2026년 11월 고용보고서' },
];

/**
 * 미국 GDP 발표 일정 2026년
 * 출처: Bureau of Economic Analysis (bea.gov/news/schedule)
 * 발표 시간: 오전 8:30 (동부) = 한국 시간 22:30 (같은 날)
 * 참고: 2025년 정부 셧다운으로 일부 일정 변경됨
 */
const usGDP2026 = [
  { date: '2026-02-20', quarter: 'Q4 2025', type: '속보', description: 'Q4 2025 GDP 속보치 (Advance)' },
  { date: '2026-03-26', quarter: 'Q4 2025', type: '수정', description: 'Q4 2025 GDP 수정치 (Second)' },
  { date: '2026-04-09', quarter: 'Q4 2025', type: '확정', description: 'Q4 2025 GDP 확정치 (Third) + 주별 GDP 동시 발표' },
  { date: '2026-04-30', quarter: 'Q1 2026', type: '속보', description: 'Q1 2026 GDP 속보치 (Advance)' },
  { date: '2026-05-28', quarter: 'Q1 2026', type: '수정', description: 'Q1 2026 GDP 수정치 (Second)' },
  { date: '2026-06-25', quarter: 'Q1 2026', type: '확정', description: 'Q1 2026 GDP 확정치 (Third)' },
  { date: '2026-07-30', quarter: 'Q2 2026', type: '속보', description: 'Q2 2026 GDP 속보치 (Advance)' },
  { date: '2026-08-27', quarter: 'Q2 2026', type: '수정', description: 'Q2 2026 GDP 수정치 (Second)' },
  { date: '2026-09-24', quarter: 'Q2 2026', type: '확정', description: 'Q2 2026 GDP 확정치 (Third)' },
  { date: '2026-10-29', quarter: 'Q3 2026', type: '속보', description: 'Q3 2026 GDP 속보치 (Advance)' },
  { date: '2026-11-25', quarter: 'Q3 2026', type: '수정', description: 'Q3 2026 GDP 수정치 (Second)' },
  { date: '2026-12-23', quarter: 'Q3 2026', type: '확정', description: 'Q3 2026 GDP 확정치 (Third)' },
];

/**
 * 미국 PCE(개인소비지출) 발표 일정 2026년
 * 출처: Bureau of Economic Analysis (bea.gov/news/schedule)
 * 연준이 선호하는 인플레이션 지표
 * 발표 시간: 오전 8:30 (동부) = 한국 시간 22:30 (같은 날)
 */
const usPCE2026 = [
  { date: '2026-02-20', dataMonth: '12월', description: '2025년 12월 PCE 물가지수' },
  { date: '2026-03-27', dataMonth: '2월', description: '2026년 2월 PCE 물가지수' },
  { date: '2026-04-30', dataMonth: '3월', description: '2026년 3월 PCE 물가지수' },
  { date: '2026-05-29', dataMonth: '4월', description: '2026년 4월 PCE 물가지수' },
  { date: '2026-06-26', dataMonth: '5월', description: '2026년 5월 PCE 물가지수' },
  { date: '2026-07-31', dataMonth: '6월', description: '2026년 6월 PCE 물가지수' },
  { date: '2026-08-28', dataMonth: '7월', description: '2026년 7월 PCE 물가지수' },
  { date: '2026-09-25', dataMonth: '8월', description: '2026년 8월 PCE 물가지수' },
  { date: '2026-10-30', dataMonth: '9월', description: '2026년 9월 PCE 물가지수' },
  { date: '2026-11-25', dataMonth: '10월', description: '2026년 10월 PCE 물가지수' },
  { date: '2026-12-23', dataMonth: '11월', description: '2026년 11월 PCE 물가지수' },
];

/**
 * 한국은행 금융통화위원회 일정 2026년
 * 출처: 한국은행 (bok.or.kr)
 * 기준금리 결정 (연 8회)
 * 발표 시간: 오전 10:00 (한국시간)
 */
const bokMeetings2026 = [
  { date: '2026-01-15', description: '2026년 1월 금융통화위원회 (기준금리 결정)' },
  { date: '2026-02-27', description: '2026년 2월 금융통화위원회 (기준금리 결정)' },
  { date: '2026-04-09', description: '2026년 4월 금융통화위원회 (기준금리 결정)' },
  { date: '2026-05-28', description: '2026년 5월 금융통화위원회 (기준금리 결정)' },
  { date: '2026-07-09', description: '2026년 7월 금융통화위원회 (기준금리 결정)' },
  { date: '2026-08-27', description: '2026년 8월 금융통화위원회 (기준금리 결정)' },
  { date: '2026-10-15', description: '2026년 10월 금융통화위원회 (기준금리 결정)' },
  { date: '2026-11-26', description: '2026년 11월 금융통화위원회 (기준금리 결정)' },
];

/**
 * ECB(유럽중앙은행) 통화정책 회의 일정 2026년
 * 출처: European Central Bank (ecb.europa.eu)
 * 6주 간격으로 8회 개최
 * 발표 시간: 오후 2:15 (중앙유럽시간) = 한국 시간 22:15 (같은 날)
 */
const ecbMeetings2026 = [
  { date: '2026-01-25', description: '1월 ECB 통화정책회의' },
  { date: '2026-03-05', description: '3월 ECB 통화정책회의' },
  { date: '2026-04-16', description: '4월 ECB 통화정책회의' },
  { date: '2026-06-04', description: '6월 ECB 통화정책회의' },
  { date: '2026-07-16', description: '7월 ECB 통화정책회의' },
  { date: '2026-09-10', description: '9월 ECB 통화정책회의 (분데스방크 개최)' },
  { date: '2026-10-29', description: '10월 ECB 통화정책회의' },
  { date: '2026-12-10', description: '12월 ECB 통화정책회의' },
];

/**
 * BOJ(일본은행) 통화정책 회의 일정 2026년
 * 출처: Bank of Japan (boj.or.jp/en/mopo/mpmsche_minu)
 * 연 8회 개최 (2일간)
 * 발표 시간: 둘째날 정오경 (일본시간) = 한국 시간 정오
 */
const bojMeetings2026 = [
  { date: '2026-01-23', description: '1월 BOJ 통화정책회의 (1/22-23) + 전망보고서', hasOutlook: true },
  { date: '2026-03-19', description: '3월 BOJ 통화정책회의 (3/18-19)', hasOutlook: false },
  { date: '2026-04-28', description: '4월 BOJ 통화정책회의 (4/27-28) + 전망보고서', hasOutlook: true },
  { date: '2026-06-16', description: '6월 BOJ 통화정책회의 (6/15-16) + JGB 매입 중간평가', hasOutlook: false },
  { date: '2026-07-31', description: '7월 BOJ 통화정책회의 (7/30-31) + 전망보고서', hasOutlook: true },
  { date: '2026-09-18', description: '9월 BOJ 통화정책회의 (9/17-18)', hasOutlook: false },
  { date: '2026-10-30', description: '10월 BOJ 통화정책회의 (10/29-30) + 전망보고서', hasOutlook: true },
  { date: '2026-12-18', description: '12월 BOJ 통화정책회의 (12/17-18)', hasOutlook: false },
];

/**
 * 빅테크 실적발표 일정 2026년
 * 출처: Nasdaq, Wall Street Horizon, 각 회사 IR
 * 참고: Q2~Q4 실적 일정은 추후 확정
 */
const bigTechEarnings2026 = [
  // Q4 2025 실적 (2026년 1-2월 발표)
  { date: '2026-01-27', company: 'Tesla', ticker: 'TSLA', quarter: 'Q4 2025', description: '테슬라 Q4 2025 실적발표' },
  { date: '2026-01-28', company: 'Microsoft', ticker: 'MSFT', quarter: 'FY26 Q2', description: '마이크로소프트 FY26 Q2 실적발표' },
  { date: '2026-01-28', company: 'Meta', ticker: 'META', quarter: 'Q4 2025', description: '메타 Q4 2025 실적발표' },
  { date: '2026-01-29', company: 'Apple', ticker: 'AAPL', quarter: 'FY26 Q1', description: '애플 FY26 Q1 실적발표' },
  { date: '2026-02-04', company: 'Amazon', ticker: 'AMZN', quarter: 'Q4 2025', description: '아마존 Q4 2025 실적발표' },
  { date: '2026-02-25', company: 'NVIDIA', ticker: 'NVDA', quarter: 'FY26 Q4', description: '엔비디아 FY26 Q4 실적발표' },
  // Q1 2026 실적 (2026년 4-5월 발표 예정)
  { date: '2026-04-28', company: 'Microsoft', ticker: 'MSFT', quarter: 'FY26 Q3', description: '마이크로소프트 FY26 Q3 실적발표 (예상)' },
  { date: '2026-04-29', company: 'Meta', ticker: 'META', quarter: 'Q1 2026', description: '메타 Q1 2026 실적발표 (예상)' },
  { date: '2026-04-30', company: 'Apple', ticker: 'AAPL', quarter: 'FY26 Q2', description: '애플 FY26 Q2 실적발표 (예상)' },
  { date: '2026-04-30', company: 'Amazon', ticker: 'AMZN', quarter: 'Q1 2026', description: '아마존 Q1 2026 실적발표 (예상)' },
  { date: '2026-05-27', company: 'NVIDIA', ticker: 'NVDA', quarter: 'FY27 Q1', description: '엔비디아 FY27 Q1 실적발표 (예상)' },
];

/**
 * 한국 주요 기업 실적발표 일정 2026년
 * 출처: 삼성전자 IR (samsung.com/sec/ir)
 */
const krEarnings2026 = [
  { date: '2026-01-08', company: '삼성전자', ticker: '005930', quarter: 'Q4 2025', description: '삼성전자 Q4 2025 잠정실적 공시' },
  { date: '2026-01-29', company: '삼성전자', ticker: '005930', quarter: 'Q4 2025', description: '삼성전자 Q4 2025 실적발표 컨퍼런스콜' },
  { date: '2026-04-07', company: '삼성전자', ticker: '005930', quarter: 'Q1 2026', description: '삼성전자 Q1 2026 잠정실적 공시 (예상)' },
  { date: '2026-04-29', company: '삼성전자', ticker: '005930', quarter: 'Q1 2026', description: '삼성전자 Q1 2026 실적발표 (예상)' },
  { date: '2026-07-07', company: '삼성전자', ticker: '005930', quarter: 'Q2 2026', description: '삼성전자 Q2 2026 잠정실적 공시 (예상)' },
  { date: '2026-07-29', company: '삼성전자', ticker: '005930', quarter: 'Q2 2026', description: '삼성전자 Q2 2026 실적발표 (예상)' },
  { date: '2026-10-07', company: '삼성전자', ticker: '005930', quarter: 'Q3 2026', description: '삼성전자 Q3 2026 잠정실적 공시 (예상)' },
  { date: '2026-10-29', company: '삼성전자', ticker: '005930', quarter: 'Q3 2026', description: '삼성전자 Q3 2026 실적발표 (예상)' },
];

/**
 * 주요 테크 컨퍼런스 일정 2026년
 * 출처: 각 컨퍼런스 공식 웹사이트
 */
const techConferences2026 = [
  { date: '2026-01-06', endDate: '2026-01-09', title: 'CES 2026', titleEn: 'CES 2026', description: '세계 최대 가전/IT 박람회 (라스베가스)', importance: 'high' as const },
  { date: '2026-02-25', title: 'Galaxy Unpacked', titleEn: 'Samsung Galaxy Unpacked', description: '삼성 갤럭시 신제품 발표 (예상)', importance: 'medium' as const },
  { date: '2026-03-02', endDate: '2026-03-05', title: 'MWC 2026', titleEn: 'Mobile World Congress 2026', description: '세계 최대 모바일 박람회 (바르셀로나)', importance: 'high' as const },
  { date: '2026-03-13', endDate: '2026-03-22', title: 'SXSW 2026', titleEn: 'SXSW 2026', description: '사우스바이사우스웨스트 (오스틴)', importance: 'medium' as const },
  { date: '2026-03-16', endDate: '2026-03-19', title: 'NVIDIA GTC 2026', titleEn: 'NVIDIA GTC 2026', description: '엔비디아 GPU 테크놀로지 컨퍼런스', importance: 'high' as const },
  { date: '2026-05-12', endDate: '2026-05-14', title: 'Google I/O 2026', titleEn: 'Google I/O 2026', description: '구글 개발자 컨퍼런스 (예상)', importance: 'high' as const },
  { date: '2026-06-08', endDate: '2026-06-12', title: 'WWDC 2026', titleEn: 'Apple WWDC 2026', description: '애플 세계 개발자 컨퍼런스 (예상)', importance: 'high' as const },
  { date: '2026-06-29', endDate: '2026-07-01', title: 'ECB Forum 2026', titleEn: 'ECB Forum on Central Banking', description: 'ECB 중앙은행 포럼 (신트라)', importance: 'medium' as const },
  { date: '2026-09-08', title: 'Apple Event', titleEn: 'Apple September Event', description: '애플 9월 이벤트 - iPhone 18 발표 (예상)', importance: 'high' as const },
];

/**
 * 한국 주요 공휴일/휴장일 2026년
 */
const krHolidays2026 = [
  { date: '2026-01-01', title: '신정', description: '증시 휴장' },
  { date: '2026-02-16', title: '설날 연휴', description: '증시 휴장 (2/16-18)' },
  { date: '2026-02-17', title: '설날', description: '증시 휴장' },
  { date: '2026-02-18', title: '설날 연휴', description: '증시 휴장' },
  { date: '2026-03-01', title: '삼일절', description: '증시 휴장' },
  { date: '2026-05-05', title: '어린이날', description: '증시 휴장' },
  { date: '2026-05-24', title: '부처님오신날', description: '증시 휴장' },
  { date: '2026-06-06', title: '현충일', description: '증시 휴장' },
  { date: '2026-08-15', title: '광복절', description: '증시 휴장' },
  { date: '2026-09-24', title: '추석 연휴', description: '증시 휴장 (9/24-26)' },
  { date: '2026-09-25', title: '추석', description: '증시 휴장' },
  { date: '2026-09-26', title: '추석 연휴', description: '증시 휴장' },
  { date: '2026-10-03', title: '개천절', description: '증시 휴장' },
  { date: '2026-10-09', title: '한글날', description: '증시 휴장' },
  { date: '2026-12-25', title: '성탄절', description: '증시 휴장' },
];

/**
 * 미국 주요 공휴일/휴장일 2026년
 */
const usHolidays2026 = [
  { date: '2026-01-01', title: "New Year's Day", description: '미국 증시 휴장' },
  { date: '2026-01-19', title: 'MLK Day', description: '마틴 루터 킹 기념일, 미국 증시 휴장' },
  { date: '2026-02-16', title: "Presidents' Day", description: '대통령의 날, 미국 증시 휴장' },
  { date: '2026-04-03', title: 'Good Friday', description: '성금요일, 미국 증시 휴장' },
  { date: '2026-05-25', title: 'Memorial Day', description: '현충일, 미국 증시 휴장' },
  { date: '2026-06-19', title: 'Juneteenth', description: '준틴스 기념일, 미국 증시 휴장' },
  { date: '2026-07-03', title: 'Independence Day (observed)', description: '독립기념일 대체휴일, 미국 증시 휴장' },
  { date: '2026-09-07', title: 'Labor Day', description: '노동절, 미국 증시 휴장' },
  { date: '2026-11-26', title: 'Thanksgiving Day', description: '추수감사절, 미국 증시 휴장' },
  { date: '2026-12-25', title: 'Christmas Day', description: '크리스마스, 미국 증시 휴장' },
];

// ==================== 이벤트 데이터 생성 함수 ====================

interface SeedEvent {
  title: string;
  titleEn?: string;
  date: string;
  endDate?: string;
  category: 'institution' | 'earnings' | 'corporate' | 'crypto';
  countryCode?: string;
  companyDomain?: string;
  importance: 'high' | 'medium' | 'low';
  time?: string;
  description?: string;
  relatedTerms?: string[];
}

/**
 * 2026년 전체 이벤트 데이터 생성
 */
function generate2026Events(): SeedEvent[] {
  const events: SeedEvent[] = [];

  // ========== 미국 경제지표 ==========

  // FOMC 회의
  fomcMeetings2026.forEach((meeting) => {
    events.push({
      title: meeting.hasSEP ? 'FOMC 회의 + 경제전망(SEP)' : 'FOMC 정례회의',
      titleEn: meeting.hasSEP ? 'FOMC Meeting + SEP' : 'FOMC Meeting',
      date: meeting.date,
      category: 'institution',
      countryCode: 'us',
      importance: 'high',
      time: '04:00',
      description: meeting.description,
      relatedTerms: ['FOMC', '기준금리', '연준', '파월'],
    });
  });

  // 미국 CPI
  usCPI2026.forEach((cpi) => {
    events.push({
      title: `미국 CPI 발표 (${cpi.dataMonth})`,
      titleEn: `US CPI Release (${cpi.dataMonth} data)`,
      date: cpi.date,
      category: 'institution',
      countryCode: 'us',
      importance: 'high',
      time: '22:30',
      description: cpi.description,
      relatedTerms: ['CPI', '소비자물가지수', '인플레이션'],
    });
  });

  // 미국 고용보고서
  usEmployment2026.forEach((emp) => {
    events.push({
      title: `미국 고용보고서 (${emp.dataMonth})`,
      titleEn: `US Employment Report (${emp.dataMonth} data)`,
      date: emp.date,
      category: 'institution',
      countryCode: 'us',
      importance: 'high',
      time: '22:30',
      description: emp.description + ' (비농업 고용, 실업률)',
      relatedTerms: ['비농업 고용', '실업률', '고용지표', 'NFP'],
    });
  });

  // 미국 GDP
  usGDP2026.forEach((gdp) => {
    events.push({
      title: `미국 GDP ${gdp.type} (${gdp.quarter})`,
      titleEn: `US GDP ${gdp.type === '속보' ? 'Advance' : gdp.type === '수정' ? 'Second' : 'Third'} (${gdp.quarter})`,
      date: gdp.date,
      category: 'institution',
      countryCode: 'us',
      importance: gdp.type === '속보' ? 'high' : 'medium',
      time: '22:30',
      description: gdp.description,
      relatedTerms: ['GDP', '경제성장률'],
    });
  });

  // 미국 PCE
  usPCE2026.forEach((pce) => {
    events.push({
      title: `미국 PCE 발표 (${pce.dataMonth})`,
      titleEn: `US PCE Release (${pce.dataMonth} data)`,
      date: pce.date,
      category: 'institution',
      countryCode: 'us',
      importance: 'high',
      time: '22:30',
      description: pce.description + ' (연준 선호 인플레이션 지표)',
      relatedTerms: ['PCE', '개인소비지출', '인플레이션', '연준'],
    });
  });

  // ========== 한국 경제지표 ==========

  // 한국은행 금융통화위원회
  bokMeetings2026.forEach((meeting) => {
    events.push({
      title: '한국은행 금융통화위원회',
      titleEn: 'BOK Monetary Policy Meeting',
      date: meeting.date,
      category: 'institution',
      countryCode: 'kr',
      importance: 'high',
      time: '10:00',
      description: meeting.description,
      relatedTerms: ['한국은행', '기준금리', '금통위'],
    });
  });

  // ========== 글로벌 중앙은행 ==========

  // ECB 회의
  ecbMeetings2026.forEach((meeting) => {
    events.push({
      title: 'ECB 통화정책회의',
      titleEn: 'ECB Monetary Policy Meeting',
      date: meeting.date,
      category: 'institution',
      countryCode: 'eu',
      importance: 'high',
      time: '22:15',
      description: meeting.description,
      relatedTerms: ['ECB', '유럽중앙은행', '라가르드'],
    });
  });

  // BOJ 회의
  bojMeetings2026.forEach((meeting) => {
    events.push({
      title: meeting.hasOutlook ? 'BOJ 통화정책회의 + 전망보고서' : 'BOJ 통화정책회의',
      titleEn: meeting.hasOutlook ? 'BOJ Meeting + Outlook Report' : 'BOJ Monetary Policy Meeting',
      date: meeting.date,
      category: 'institution',
      countryCode: 'jp',
      importance: 'high',
      time: '12:00',
      description: meeting.description,
      relatedTerms: ['BOJ', '일본은행', '우에다'],
    });
  });

  // ========== 빅테크 실적발표 ==========

  bigTechEarnings2026.forEach((earning) => {
    events.push({
      title: `${earning.company} 실적발표 (${earning.quarter})`,
      titleEn: `${earning.company} Earnings (${earning.quarter})`,
      date: earning.date,
      category: 'earnings',
      companyDomain: earning.company.toLowerCase() + '.com',
      importance: 'high',
      time: '06:00', // 장 마감 후 발표 = 한국 다음날 새벽
      description: earning.description,
      relatedTerms: [earning.ticker, earning.company],
    });
  });

  // ========== 한국 기업 실적발표 ==========

  krEarnings2026.forEach((earning) => {
    events.push({
      title: `${earning.company} 실적발표 (${earning.quarter})`,
      titleEn: `${earning.company} Earnings (${earning.quarter})`,
      date: earning.date,
      category: 'earnings',
      countryCode: 'kr',
      importance: 'high',
      time: '10:00',
      description: earning.description,
      relatedTerms: [earning.ticker, earning.company],
    });
  });

  // ========== 테크 컨퍼런스 ==========

  techConferences2026.forEach((conf) => {
    events.push({
      title: conf.title,
      titleEn: conf.titleEn,
      date: conf.date,
      endDate: conf.endDate,
      category: 'corporate',
      importance: conf.importance,
      description: conf.description,
      relatedTerms: [conf.title],
    });
  });

  // ========== 휴장일 ==========

  // 한국 휴장일
  krHolidays2026.forEach((holiday) => {
    events.push({
      title: `한국 ${holiday.title}`,
      titleEn: holiday.title,
      date: holiday.date,
      category: 'corporate',
      countryCode: 'kr',
      importance: 'low',
      description: holiday.description,
    });
  });

  // 미국 휴장일
  usHolidays2026.forEach((holiday) => {
    events.push({
      title: `미국 ${holiday.title}`,
      titleEn: holiday.title,
      date: holiday.date,
      category: 'corporate',
      countryCode: 'us',
      importance: 'low',
      description: holiday.description,
    });
  });

  return events;
}

// ==================== API 핸들러 ====================

/**
 * POST /api/calendar/seed
 *
 * 캘린더 이벤트를 Firestore에 시드합니다.
 */
export async function POST(request: NextRequest) {
  try {
    // 요청 본문에서 옵션 파싱
    let options = { include2026: true, clearExisting: false };
    try {
      const body = await request.json();
      options = { ...options, ...body };
    } catch {
      // 빈 요청 본문 허용
    }

    const results = {
      events2026Added: 0,
      errors: [] as string[],
      categories: {} as Record<string, number>,
    };

    // 2026년 이벤트 시드
    if (options.include2026) {
      const events2026 = generate2026Events();

      for (const event of events2026) {
        try {
          await createDocument(calendarEventsCollection(), {
            title: event.title,
            titleEn: event.titleEn,
            date: event.date,
            endDate: event.endDate,
            category: event.category,
            countryCode: event.countryCode,
            companyDomain: event.companyDomain,
            importance: event.importance,
            time: event.time,
            description: event.description,
            relatedTerms: event.relatedTerms,
          });
          results.events2026Added++;

          // 카테고리별 카운트
          if (!results.categories[event.category]) {
            results.categories[event.category] = 0;
          }
          results.categories[event.category]++;
        } catch (error) {
          results.errors.push(`이벤트 추가 실패: ${event.title} (${event.date})`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: '2026년 캘린더 이벤트 시드 완료',
      results: {
        totalAdded: results.events2026Added,
        byCategory: results.categories,
        errors: results.errors.length > 0 ? results.errors : undefined,
      },
    });
  } catch (error) {
    console.error('[Calendar Seed API] 에러:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'SEED_ERROR',
        message: '캘린더 이벤트 시드 중 오류가 발생했습니다.',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/calendar/seed
 *
 * 현재 Firestore의 캘린더 이벤트 개수를 조회합니다.
 */
export async function GET() {
  try {
    const events = await queryCollection(calendarEventsCollection(), []);

    // 카테고리별 카운트
    const categories: Record<string, number> = {};
    events.forEach((event) => {
      const cat = (event as { category?: string }).category || 'unknown';
      if (!categories[cat]) categories[cat] = 0;
      categories[cat]++;
    });

    return NextResponse.json({
      success: true,
      count: events.length,
      byCategory: categories,
      message: `Firestore에 ${events.length}개의 캘린더 이벤트가 있습니다.`,
    });
  } catch (error) {
    console.error('[Calendar Seed API] 조회 에러:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'QUERY_ERROR',
        message: 'Firestore 조회 중 오류가 발생했습니다.',
      },
      { status: 500 }
    );
  }
}

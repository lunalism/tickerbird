/**
 * 종목 마스터 유틸리티
 *
 * 한국투자증권에서 제공하는 종목 마스터 파일을 다운로드하고 파싱합니다.
 * 파싱된 데이터는 파일 캐시에 저장하여 재사용합니다.
 *
 * 마스터 파일 URL (한국투자증권 공식):
 * - KOSPI: https://new.real.download.dws.co.kr/common/master/kospi_code.mst.zip
 * - KOSDAQ: https://new.real.download.dws.co.kr/common/master/kosdaq_code.mst.zip
 * - NASDAQ: https://new.real.download.dws.co.kr/common/master/nasmst.cod.zip
 * - NYSE: https://new.real.download.dws.co.kr/common/master/nysmst.cod.zip
 * - AMEX: https://new.real.download.dws.co.kr/common/master/amsmst.cod.zip
 *
 * 캐시 파일:
 * - .next/cache/stocks-kr.json (한국 종목)
 * - .next/cache/stocks-us.json (미국 종목)
 *
 * 캐시 만료: 24시간
 *
 * @see https://github.com/koreainvestment/open-trading-api/blob/main/examples/python/master_download/master_download.py
 */

import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';

// ==================== 타입 정의 ====================

/**
 * 한국 종목 정보
 */
export interface KoreanStockMaster {
  /** 종목코드 (6자리) */
  symbol: string;
  /** 종목명 (한글) */
  name: string;
  /** 시장구분 (KOSPI | KOSDAQ) */
  market: 'KOSPI' | 'KOSDAQ';
  /** 섹터/업종 */
  sector?: string;
}

/**
 * 미국 종목 정보
 */
export interface USStockMaster {
  /** 티커 심볼 */
  symbol: string;
  /** 종목명 (영문) */
  name: string;
  /** 종목명 (한글, 있는 경우) */
  nameKr?: string;
  /** 거래소 (NASDAQ | NYSE | AMEX) */
  exchange: 'NASDAQ' | 'NYSE' | 'AMEX';
}

/**
 * 캐시된 마스터 데이터
 */
interface CachedMasterData<T> {
  /** 데이터 */
  data: T[];
  /** 캐시 생성 시간 */
  createdAt: string;
  /** 캐시 만료 시간 */
  expiresAt: string;
}

// ==================== 상수 ====================

const CACHE_DIR = path.join(process.cwd(), '.next', 'cache');
const KR_CACHE_FILE = path.join(CACHE_DIR, 'stocks-kr.json');
const US_CACHE_FILE = path.join(CACHE_DIR, 'stocks-us.json');

// 캐시 만료 시간 (24시간)
const CACHE_TTL = 24 * 60 * 60 * 1000;

// 한국투자증권 마스터 파일 URL
const MASTER_URLS = {
  kospi: 'https://new.real.download.dws.co.kr/common/master/kospi_code.mst.zip',
  kosdaq: 'https://new.real.download.dws.co.kr/common/master/kosdaq_code.mst.zip',
  nasdaq: 'https://new.real.download.dws.co.kr/common/master/nasmst.cod.zip',
  nyse: 'https://new.real.download.dws.co.kr/common/master/nysmst.cod.zip',
  amex: 'https://new.real.download.dws.co.kr/common/master/amsmst.cod.zip',
};

// ==================== 캐시 함수 ====================

/**
 * 캐시 디렉토리 생성
 */
function ensureCacheDir(): void {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

/**
 * 캐시 파일에서 데이터 로드
 *
 * @param filePath 캐시 파일 경로
 * @returns 캐시된 데이터 또는 null (없거나 만료된 경우)
 */
function loadFromCache<T>(filePath: string): T[] | null {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`[Stock Master] 캐시 파일 없음: ${filePath}`);
      return null;
    }

    const data = fs.readFileSync(filePath, 'utf-8');
    const cached: CachedMasterData<T> = JSON.parse(data);

    // 만료 확인
    const now = new Date();
    const expiresAt = new Date(cached.expiresAt);

    if (now >= expiresAt) {
      console.log(`[Stock Master] 캐시 만료: ${filePath}`);
      return null;
    }

    console.log(`[Stock Master] 캐시 로드 성공: ${cached.data.length}개 종목`);
    return cached.data;
  } catch (error) {
    console.error(`[Stock Master] 캐시 로드 실패:`, error);
    return null;
  }
}

/**
 * 캐시 파일에 데이터 저장
 *
 * @param filePath 캐시 파일 경로
 * @param data 저장할 데이터
 */
function saveToCache<T>(filePath: string, data: T[]): void {
  try {
    ensureCacheDir();

    const now = new Date();
    const cached: CachedMasterData<T> = {
      data,
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + CACHE_TTL).toISOString(),
    };

    fs.writeFileSync(filePath, JSON.stringify(cached, null, 2), 'utf-8');
    console.log(`[Stock Master] 캐시 저장 성공: ${data.length}개 종목`);
  } catch (error) {
    console.error(`[Stock Master] 캐시 저장 실패:`, error);
  }
}

// ==================== 마스터 파일 다운로드 및 파싱 ====================

/**
 * ZIP 파일 다운로드 및 압축 해제
 *
 * adm-zip 라이브러리를 사용하여 실제 ZIP 형식 파일을 압축 해제합니다.
 *
 * @param url 다운로드 URL
 * @returns 압축 해제된 데이터 (Buffer)
 */
async function downloadAndUnzip(url: string): Promise<Buffer> {
  console.log(`[Stock Master] 다운로드 중: ${url}`);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`다운로드 실패: ${response.status} ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // adm-zip을 사용하여 ZIP 압축 해제
  const zip = new AdmZip(buffer);
  const zipEntries = zip.getEntries();

  // ZIP 파일 내 첫 번째 파일의 내용 반환
  if (zipEntries.length === 0) {
    throw new Error('ZIP 파일 내 파일이 없습니다.');
  }

  const unzipped = zip.readFile(zipEntries[0]);
  if (!unzipped) {
    throw new Error('ZIP 파일 압축 해제 실패');
  }

  console.log(`[Stock Master] 압축 해제 완료: ${unzipped.length} bytes`);

  return unzipped;
}

/**
 * 종목명에서 불필요한 접미사 제거
 *
 * 한국 마스터 파일의 종목명에는 ST10, EF 0000 등의 코드가 포함됨
 * 이를 제거하여 순수한 종목명만 추출
 *
 * @param name 원본 종목명
 * @returns 정제된 종목명
 */
function cleanStockName(name: string): string {
  // 공백과 특수문자 정리
  let cleaned = name.trim();

  // ST로 시작하는 코드 제거 (예: ST10, ST30, ST000)
  // 공백이 있거나 없어도 매칭
  cleaned = cleaned.replace(/\s*ST\d+.*$/, '');

  // EF로 시작하는 코드 제거 (예: EF 0000, EF 000000000, EF)
  // 공백이 있거나 없어도 매칭
  cleaned = cleaned.replace(/\s+EF(\s+.*)?$/, '');
  cleaned = cleaned.replace(/\s*EF\s*$/, '');

  // BC로 시작하는 코드 제거
  cleaned = cleaned.replace(/\s+BC\s+.*$/, '');

  // 남은 공백 정리
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned;
}

/**
 * 국내 주식 마스터 파일 파싱
 *
 * 파일 형식 (한국투자증권 공식 문서 참고):
 * - 각 레코드는 고정 길이 필드로 구성
 * - 종목코드(6), 공백(3), 표준코드(12), 한글명(40), ...
 * - EUC-KR 인코딩
 *
 * @param data 압축 해제된 마스터 파일 데이터
 * @param market 시장 구분
 * @returns 파싱된 종목 목록
 */
function parseKoreanMaster(data: Buffer, market: 'KOSPI' | 'KOSDAQ'): KoreanStockMaster[] {
  const stocks: KoreanStockMaster[] = [];

  try {
    // EUC-KR 인코딩 디코딩
    const decoder = new TextDecoder('euc-kr');
    const text = decoder.decode(data);

    // 줄 단위로 분리
    const lines = text.split('\n');

    for (const line of lines) {
      if (line.trim().length < 30) continue; // 최소 길이 체크

      try {
        // 고정 길이 필드 파싱 (한국투자증권 형식)
        // 종목코드(0-5) + 공백(6-8) + ISIN(9-20) + 한글명(21-60)
        const symbol = line.substring(0, 6).trim();
        const rawName = line.substring(21, 61);

        // 유효한 6자리 숫자 코드인지 확인
        if (!/^\d{6}$/.test(symbol)) continue;

        // 종목명 정제
        const name = cleanStockName(rawName);

        // 종목명이 없으면 건너뜀
        if (!name || name === '') continue;

        stocks.push({
          symbol,
          name,
          market,
        });
      } catch {
        // 파싱 실패한 줄은 건너뜀
        continue;
      }
    }
  } catch (error) {
    console.error(`[Stock Master] 국내 마스터 파싱 오류:`, error);
  }

  console.log(`[Stock Master] ${market} 파싱 완료: ${stocks.length}개 종목`);
  return stocks;
}

/**
 * 해외 주식 마스터 파일 파싱
 *
 * 파일 형식 (한국투자증권 공식 문서 참고):
 * - 탭(0x09) 구분자로 분리된 형식
 * - 컬럼 순서 (실제 확인된 형식):
 *   [0]: US (국가 코드)
 *   [1]: 22 (코드)
 *   [2]: NAS/NYS/AMS (거래소 코드)
 *   [3]: 나스닥/뉴욕/아멕스 (거래소 한글명)
 *   [4]: AAPL (심볼)
 *   [5]: NASAAPL (확장 심볼)
 *   [6]: 애플 (한글 종목명)
 *   [7]: APPLE INC (영문 종목명)
 *   [8]: 2/3 (종목 유형)
 *   [9]: USD (통화)
 *   ...
 * - EUC-KR 인코딩
 *
 * @param data 압축 해제된 마스터 파일 데이터
 * @param exchange 거래소 구분
 * @returns 파싱된 종목 목록
 */
function parseUSMaster(data: Buffer, exchange: 'NASDAQ' | 'NYSE' | 'AMEX'): USStockMaster[] {
  const stocks: USStockMaster[] = [];

  try {
    // EUC-KR 인코딩으로 디코딩 (한글명이 EUC-KR)
    const decoder = new TextDecoder('euc-kr');
    const text = decoder.decode(data);

    // 줄 단위로 분리
    const lines = text.split('\n');

    for (const line of lines) {
      if (line.trim().length < 10) continue;

      try {
        // 탭으로 분리
        const parts = line.split('\t');

        // 최소 8개 필드 필요: US, 코드, 거래소, 거래소명, 심볼, 확장심볼, 한글명, 영문명
        if (parts.length < 8) continue;

        /**
         * 필드 매핑 (올바른 순서):
         * - parts[4]: 심볼 (예: AAPL, PLTR)
         * - parts[7]: 영문 종목명 (예: APPLE INC, PALANTIR TECHNOLOGIES INC)
         * - parts[6]: 한글 종목명 (예: 애플, 팔란티어 테크)
         */
        const symbol = parts[4]?.trim() || '';
        const name = parts[7]?.trim() || '';  // 영문 종목명 (수정됨: parts[6] → parts[7])
        const nameKr = parts[6]?.trim() || '';  // 한글 종목명 (수정됨: parts[3] → parts[6])

        // 유효한 심볼인지 확인 (영문 대문자, 숫자, 일부 특수문자)
        if (!/^[A-Z0-9.\-]+$/.test(symbol)) continue;
        if (symbol.length > 10 || symbol.length < 1) continue;

        // 영문 종목명이 없으면 한글 종목명 사용, 둘 다 없으면 건너뜀
        const finalName = name || nameKr || '';
        if (!finalName || finalName === '') continue;

        stocks.push({
          symbol,
          name: finalName,  // 영문명 우선, 없으면 한글명
          nameKr: nameKr || undefined,  // 한글명 (별도 저장)
          exchange,
        });
      } catch {
        continue;
      }
    }
  } catch (error) {
    console.error(`[Stock Master] 해외 마스터 파싱 오류:`, error);
  }

  console.log(`[Stock Master] ${exchange} 파싱 완료: ${stocks.length}개 종목`);
  return stocks;
}

// ==================== 메인 함수 ====================

/**
 * 한국 종목 마스터 조회
 *
 * 캐시에서 로드하거나, 없으면 한국투자증권에서 다운로드합니다.
 *
 * @param forceRefresh 캐시 무시하고 강제 갱신
 * @returns 한국 종목 목록 (KOSPI + KOSDAQ)
 */
export async function getKoreanStockMaster(forceRefresh = false): Promise<KoreanStockMaster[]> {
  // 캐시 확인 (강제 갱신이 아닌 경우)
  if (!forceRefresh) {
    const cached = loadFromCache<KoreanStockMaster>(KR_CACHE_FILE);
    if (cached) {
      return cached;
    }
  }

  console.log('[Stock Master] 한국 종목 마스터 다운로드 시작...');

  const stocks: KoreanStockMaster[] = [];

  try {
    // KOSPI 다운로드 및 파싱
    const kospiData = await downloadAndUnzip(MASTER_URLS.kospi);
    const kospiStocks = parseKoreanMaster(kospiData, 'KOSPI');
    stocks.push(...kospiStocks);
  } catch (error) {
    console.error('[Stock Master] KOSPI 마스터 다운로드 실패:', error);
  }

  try {
    // KOSDAQ 다운로드 및 파싱
    const kosdaqData = await downloadAndUnzip(MASTER_URLS.kosdaq);
    const kosdaqStocks = parseKoreanMaster(kosdaqData, 'KOSDAQ');
    stocks.push(...kosdaqStocks);
  } catch (error) {
    console.error('[Stock Master] KOSDAQ 마스터 다운로드 실패:', error);
  }

  // 중복 제거 (종목코드 기준)
  const uniqueStocks = Array.from(
    new Map(stocks.map((s) => [s.symbol, s])).values()
  );

  console.log(`[Stock Master] 한국 종목 마스터 완료: ${uniqueStocks.length}개 종목`);

  // 캐시에 저장
  if (uniqueStocks.length > 0) {
    saveToCache(KR_CACHE_FILE, uniqueStocks);
  }

  return uniqueStocks;
}

/**
 * 미국 종목 마스터 조회
 *
 * 캐시에서 로드하거나, 없으면 한국투자증권에서 다운로드합니다.
 *
 * @param forceRefresh 캐시 무시하고 강제 갱신
 * @returns 미국 종목 목록 (NASDAQ + NYSE + AMEX)
 */
export async function getUSStockMaster(forceRefresh = false): Promise<USStockMaster[]> {
  // 캐시 확인 (강제 갱신이 아닌 경우)
  if (!forceRefresh) {
    const cached = loadFromCache<USStockMaster>(US_CACHE_FILE);
    if (cached) {
      return cached;
    }
  }

  console.log('[Stock Master] 미국 종목 마스터 다운로드 시작...');

  const stocks: USStockMaster[] = [];

  try {
    // NASDAQ 다운로드 및 파싱
    const nasdaqData = await downloadAndUnzip(MASTER_URLS.nasdaq);
    const nasdaqStocks = parseUSMaster(nasdaqData, 'NASDAQ');
    stocks.push(...nasdaqStocks);
  } catch (error) {
    console.error('[Stock Master] NASDAQ 마스터 다운로드 실패:', error);
  }

  try {
    // NYSE 다운로드 및 파싱
    const nyseData = await downloadAndUnzip(MASTER_URLS.nyse);
    const nyseStocks = parseUSMaster(nyseData, 'NYSE');
    stocks.push(...nyseStocks);
  } catch (error) {
    console.error('[Stock Master] NYSE 마스터 다운로드 실패:', error);
  }

  try {
    // AMEX 다운로드 및 파싱
    const amexData = await downloadAndUnzip(MASTER_URLS.amex);
    const amexStocks = parseUSMaster(amexData, 'AMEX');
    stocks.push(...amexStocks);
  } catch (error) {
    console.error('[Stock Master] AMEX 마스터 다운로드 실패:', error);
  }

  // 중복 제거 (심볼 기준)
  const uniqueStocks = Array.from(
    new Map(stocks.map((s) => [s.symbol, s])).values()
  );

  console.log(`[Stock Master] 미국 종목 마스터 완료: ${uniqueStocks.length}개 종목`);

  // 캐시에 저장
  if (uniqueStocks.length > 0) {
    saveToCache(US_CACHE_FILE, uniqueStocks);
  }

  return uniqueStocks;
}

/**
 * 전체 종목 마스터 조회 (한국 + 미국)
 *
 * @param forceRefresh 캐시 무시하고 강제 갱신
 * @returns 한국 및 미국 종목 목록
 */
export async function getAllStockMaster(forceRefresh = false): Promise<{
  korean: KoreanStockMaster[];
  us: USStockMaster[];
}> {
  const [korean, us] = await Promise.all([
    getKoreanStockMaster(forceRefresh),
    getUSStockMaster(forceRefresh),
  ]);

  return { korean, us };
}

/**
 * 캐시 상태 확인
 *
 * @returns 캐시 상태 정보
 */
export function getCacheStatus(): {
  korean: { exists: boolean; expiresAt: string | null; count: number };
  us: { exists: boolean; expiresAt: string | null; count: number };
} {
  const getStatus = (filePath: string) => {
    try {
      if (!fs.existsSync(filePath)) {
        return { exists: false, expiresAt: null, count: 0 };
      }

      const data = fs.readFileSync(filePath, 'utf-8');
      const cached = JSON.parse(data);

      return {
        exists: true,
        expiresAt: cached.expiresAt,
        count: cached.data?.length || 0,
      };
    } catch {
      return { exists: false, expiresAt: null, count: 0 };
    }
  };

  return {
    korean: getStatus(KR_CACHE_FILE),
    us: getStatus(US_CACHE_FILE),
  };
}

/**
 * 캐시 삭제
 */
export function clearCache(): void {
  try {
    if (fs.existsSync(KR_CACHE_FILE)) {
      fs.unlinkSync(KR_CACHE_FILE);
      console.log('[Stock Master] 한국 종목 캐시 삭제됨');
    }
    if (fs.existsSync(US_CACHE_FILE)) {
      fs.unlinkSync(US_CACHE_FILE);
      console.log('[Stock Master] 미국 종목 캐시 삭제됨');
    }
  } catch (error) {
    console.error('[Stock Master] 캐시 삭제 실패:', error);
  }
}

/**
 * KIS API 토큰 캐싱 모듈
 *
 * Vercel 서버리스 환경에서 여러 함수 인스턴스가 토큰을 공유할 수 있도록
 * Upstash Redis를 사용하여 중앙 집중식 토큰 캐싱을 구현합니다.
 *
 * 환경별 동작:
 * - Vercel (UPSTASH_REDIS_REST_URL 설정됨): Redis에 토큰 저장/조회
 * - 로컬 개발: 파일 기반 캐싱 (.next/cache/kis-token.json)
 *
 * Rate Limit 방지:
 * - 한투 API는 토큰 발급에 1분당 1회 제한
 * - Redis를 통해 모든 서버리스 인스턴스가 동일 토큰 공유
 * - 중복 발급 요청 방지
 */

import { Redis } from '@upstash/redis';
import fs from 'fs';
import path from 'path';

// Redis 키 상수
const TOKEN_KEY = 'kis:access_token';
const TOKEN_EXPIRES_KEY = 'kis:token_expires_at';
const TOKEN_LOCK_KEY = 'kis:token_lock';

// 로컬 파일 캐시 경로
const LOCAL_CACHE_FILE = path.join(process.cwd(), '.next', 'cache', 'kis-token.json');

// Upstash Redis 클라이언트 (환경변수가 있을 때만 생성)
let redis: Redis | null = null;

/**
 * Redis 클라이언트 초기화
 *
 * 환경변수가 설정되어 있으면 Redis 클라이언트를 생성합니다.
 * 설정되지 않으면 null을 반환하여 파일 캐시로 폴백합니다.
 */
function getRedisClient(): Redis | null {
  if (redis) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.log('[TokenCache] Redis 환경변수 미설정, 파일 캐시 사용');
    return null;
  }

  try {
    redis = new Redis({ url, token });
    console.log('[TokenCache] Redis 클라이언트 초기화 완료');
    return redis;
  } catch (error) {
    console.error('[TokenCache] Redis 클라이언트 초기화 실패:', error);
    return null;
  }
}

/**
 * 캐시된 토큰 인터페이스
 */
export interface CachedTokenData {
  accessToken: string;
  expiresAt: Date;
}

/**
 * Redis에서 토큰 조회
 *
 * @returns 유효한 토큰이 있으면 CachedTokenData, 없으면 null
 */
async function getTokenFromRedis(): Promise<CachedTokenData | null> {
  const client = getRedisClient();
  if (!client) return null;

  try {
    const [token, expiresAtStr] = await Promise.all([
      client.get<string>(TOKEN_KEY),
      client.get<string>(TOKEN_EXPIRES_KEY),
    ]);

    if (!token || !expiresAtStr) {
      console.log('[TokenCache] Redis에 토큰 없음');
      return null;
    }

    const expiresAt = new Date(expiresAtStr);
    const now = new Date();
    const bufferTime = 10 * 60 * 1000; // 10분 버퍼

    // 만료 임박 확인
    if (expiresAt.getTime() - bufferTime <= now.getTime()) {
      console.log('[TokenCache] Redis 토큰 만료 임박');
      return null;
    }

    console.log(`[TokenCache] Redis에서 토큰 조회 성공, 만료: ${expiresAt.toISOString()}`);
    return { accessToken: token, expiresAt };
  } catch (error) {
    console.error('[TokenCache] Redis 토큰 조회 실패:', error);
    return null;
  }
}

/**
 * Redis에 토큰 저장
 *
 * @param token 저장할 토큰 정보
 */
async function saveTokenToRedis(token: CachedTokenData): Promise<void> {
  const client = getRedisClient();
  if (!client) return;

  try {
    // 토큰 만료 시간까지 TTL 설정
    const ttlSeconds = Math.floor((token.expiresAt.getTime() - Date.now()) / 1000);

    await Promise.all([
      client.set(TOKEN_KEY, token.accessToken, { ex: ttlSeconds }),
      client.set(TOKEN_EXPIRES_KEY, token.expiresAt.toISOString(), { ex: ttlSeconds }),
    ]);

    console.log(`[TokenCache] Redis에 토큰 저장 완료, TTL: ${ttlSeconds}초`);
  } catch (error) {
    console.error('[TokenCache] Redis 토큰 저장 실패:', error);
  }
}

/**
 * 분산 락 획득 (토큰 발급 중복 방지)
 *
 * 여러 서버리스 인스턴스가 동시에 토큰을 발급하지 않도록
 * Redis를 사용한 분산 락을 구현합니다.
 *
 * @param ttlSeconds 락 유효 시간 (초)
 * @returns 락 획득 성공 여부
 */
export async function acquireTokenLock(ttlSeconds: number = 30): Promise<boolean> {
  const client = getRedisClient();
  if (!client) return true; // Redis 없으면 항상 성공 (로컬 개발)

  try {
    // SET NX (Not eXists) - 키가 없을 때만 설정
    const result = await client.set(TOKEN_LOCK_KEY, Date.now().toString(), {
      nx: true,
      ex: ttlSeconds,
    });

    const acquired = result === 'OK';
    console.log(`[TokenCache] 토큰 락 ${acquired ? '획득' : '대기'}`);
    return acquired;
  } catch (error) {
    console.error('[TokenCache] 토큰 락 획득 실패:', error);
    return true; // 에러 시 진행 허용
  }
}

/**
 * 분산 락 해제
 */
export async function releaseTokenLock(): Promise<void> {
  const client = getRedisClient();
  if (!client) return;

  try {
    await client.del(TOKEN_LOCK_KEY);
    console.log('[TokenCache] 토큰 락 해제');
  } catch (error) {
    console.error('[TokenCache] 토큰 락 해제 실패:', error);
  }
}

/**
 * 토큰 락 대기
 *
 * 다른 인스턴스가 토큰을 발급 중이면 완료될 때까지 대기합니다.
 *
 * @param maxWaitMs 최대 대기 시간 (밀리초)
 * @param intervalMs 확인 간격 (밀리초)
 */
export async function waitForTokenLock(maxWaitMs: number = 10000, intervalMs: number = 500): Promise<void> {
  const client = getRedisClient();
  if (!client) return;

  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const lockExists = await client.exists(TOKEN_LOCK_KEY);
    if (!lockExists) {
      console.log('[TokenCache] 토큰 락 해제됨, 진행');
      return;
    }

    console.log('[TokenCache] 토큰 락 대기 중...');
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }

  console.log('[TokenCache] 토큰 락 대기 타임아웃');
}

// ==================== 파일 캐시 함수 (로컬 개발용) ====================

/**
 * 파일에서 토큰 조회 (로컬 개발용)
 */
function getTokenFromFile(): CachedTokenData | null {
  try {
    if (!fs.existsSync(LOCAL_CACHE_FILE)) {
      return null;
    }

    const data = fs.readFileSync(LOCAL_CACHE_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    const expiresAt = new Date(parsed.expiresAt);

    const now = new Date();
    const bufferTime = 10 * 60 * 1000;

    if (expiresAt.getTime() - bufferTime <= now.getTime()) {
      return null;
    }

    return { accessToken: parsed.accessToken, expiresAt };
  } catch {
    return null;
  }
}

/**
 * 파일에 토큰 저장 (로컬 개발용)
 */
function saveTokenToFile(token: CachedTokenData): void {
  try {
    const dir = path.dirname(LOCAL_CACHE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const data = JSON.stringify({
      accessToken: token.accessToken,
      expiresAt: token.expiresAt.toISOString(),
    }, null, 2);

    fs.writeFileSync(LOCAL_CACHE_FILE, data, 'utf-8');
  } catch (error) {
    console.warn('[TokenCache] 파일 저장 실패:', error);
  }
}

// ==================== 통합 인터페이스 ====================

/**
 * 캐시된 토큰 조회 (Redis → 파일 순서)
 *
 * @returns 유효한 토큰이 있으면 CachedTokenData, 없으면 null
 */
export async function getCachedToken(): Promise<CachedTokenData | null> {
  // 1. Redis 확인 (Vercel 환경)
  const redisToken = await getTokenFromRedis();
  if (redisToken) {
    return redisToken;
  }

  // 2. 파일 캐시 확인 (로컬 개발)
  const fileToken = getTokenFromFile();
  if (fileToken) {
    console.log('[TokenCache] 파일 캐시에서 토큰 조회 성공');
    return fileToken;
  }

  return null;
}

/**
 * 토큰 저장 (Redis + 파일)
 *
 * @param token 저장할 토큰 정보
 */
export async function saveToken(token: CachedTokenData): Promise<void> {
  // Redis에 저장 (Vercel 환경)
  await saveTokenToRedis(token);

  // 파일에도 저장 (백업 + 로컬 개발)
  saveTokenToFile(token);

  console.log(`[TokenCache] 토큰 저장 완료, 만료: ${token.expiresAt.toISOString()}`);
}

/**
 * 토큰 캐시 삭제
 */
export async function clearTokenCache(): Promise<void> {
  const client = getRedisClient();

  // Redis 캐시 삭제
  if (client) {
    try {
      await Promise.all([
        client.del(TOKEN_KEY),
        client.del(TOKEN_EXPIRES_KEY),
        client.del(TOKEN_LOCK_KEY),
      ]);
      console.log('[TokenCache] Redis 토큰 캐시 삭제');
    } catch (error) {
      console.error('[TokenCache] Redis 캐시 삭제 실패:', error);
    }
  }

  // 파일 캐시 삭제
  try {
    if (fs.existsSync(LOCAL_CACHE_FILE)) {
      fs.unlinkSync(LOCAL_CACHE_FILE);
      console.log('[TokenCache] 파일 토큰 캐시 삭제');
    }
  } catch (error) {
    console.warn('[TokenCache] 파일 캐시 삭제 실패:', error);
  }
}

/**
 * Redis 사용 가능 여부 확인
 */
export function isRedisAvailable(): boolean {
  return getRedisClient() !== null;
}

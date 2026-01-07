/**
 * 용어사전 텍스트 파싱 유틸리티
 *
 * 텍스트에서 용어사전 용어를 자동 감지하여
 * 툴팁을 표시할 수 있도록 파싱합니다.
 */

import { GlossaryTerm } from '@/types';
import { glossaryTerms } from '@/constants/glossary';

/**
 * 파싱된 텍스트 세그먼트
 */
export interface ParsedSegment {
  type: 'text' | 'term';
  content: string;
  term?: GlossaryTerm;
}

/**
 * 용어 매칭 정보
 */
interface TermMatch {
  term: GlossaryTerm;
  start: number;
  end: number;
  matchedText: string;
}

/**
 * 용어사전 용어들의 매칭 패턴 생성
 * - 영문 약어 (CPI, FOMC, Fed 등)
 * - 한글 용어 (소비자물가지수, 연준 등)
 * - 대소문자 구분 없이 매칭
 */
function buildTermPatterns(): Map<string, GlossaryTerm> {
  const patterns = new Map<string, GlossaryTerm>();

  for (const term of glossaryTerms) {
    // 약어 (대소문자 구분 없이)
    if (term.abbreviation) {
      patterns.set(term.abbreviation.toLowerCase(), term);
    }

    // 한글 이름
    if (term.korean) {
      patterns.set(term.korean, term);
    }

    // 영문 전체 이름 (긴 이름은 매칭에서 제외 - 너무 일반적인 단어일 수 있음)
    // 예: "Moving Average"는 너무 일반적이므로 약어만 매칭
  }

  return patterns;
}

// 패턴 캐시
const termPatterns = buildTermPatterns();

/**
 * 텍스트에서 용어사전 용어 찾기
 *
 * @param text 검색할 텍스트
 * @returns 매칭된 용어 배열 (위치 정보 포함)
 */
function findTermMatches(text: string): TermMatch[] {
  const matches: TermMatch[] = [];
  const lowerText = text.toLowerCase();

  // 모든 패턴에 대해 검색
  for (const [pattern, term] of termPatterns) {
    let searchPos = 0;

    while (true) {
      // 한글은 그대로, 영문은 소문자로 검색
      const isKorean = /[가-힣]/.test(pattern);
      const searchText = isKorean ? text : lowerText;
      const searchPattern = isKorean ? pattern : pattern.toLowerCase();

      const index = searchText.indexOf(searchPattern, searchPos);
      if (index === -1) break;

      // 단어 경계 확인 (영문의 경우)
      if (!isKorean) {
        const beforeChar = index > 0 ? text[index - 1] : ' ';
        const afterChar = index + pattern.length < text.length
          ? text[index + pattern.length]
          : ' ';

        // 앞뒤가 알파벳이나 숫자면 건너뛰기 (부분 매칭 방지)
        const isWordBoundaryBefore = !/[a-zA-Z0-9]/.test(beforeChar);
        const isWordBoundaryAfter = !/[a-zA-Z0-9]/.test(afterChar);

        if (!isWordBoundaryBefore || !isWordBoundaryAfter) {
          searchPos = index + 1;
          continue;
        }
      }

      matches.push({
        term,
        start: index,
        end: index + pattern.length,
        matchedText: text.slice(index, index + pattern.length),
      });

      searchPos = index + pattern.length;
    }
  }

  // 시작 위치로 정렬하고, 겹치는 매칭 제거 (긴 매칭 우선)
  matches.sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start;
    return (b.end - b.start) - (a.end - a.start); // 긴 매칭 우선
  });

  // 겹치는 매칭 제거
  const filteredMatches: TermMatch[] = [];
  let lastEnd = 0;

  for (const match of matches) {
    if (match.start >= lastEnd) {
      filteredMatches.push(match);
      lastEnd = match.end;
    }
  }

  return filteredMatches;
}

/**
 * 텍스트를 파싱하여 용어와 일반 텍스트로 분리
 *
 * @param text 파싱할 텍스트
 * @returns 파싱된 세그먼트 배열
 *
 * @example
 * parseTextWithGlossary("Fed가 CPI 발표 후 금리를 인상했다")
 * // Returns:
 * // [
 * //   { type: 'term', content: 'Fed', term: {...} },
 * //   { type: 'text', content: '가 ' },
 * //   { type: 'term', content: 'CPI', term: {...} },
 * //   { type: 'text', content: ' 발표 후 금리를 인상했다' },
 * // ]
 */
export function parseTextWithGlossary(text: string): ParsedSegment[] {
  if (!text) return [];

  const matches = findTermMatches(text);

  if (matches.length === 0) {
    return [{ type: 'text', content: text }];
  }

  const segments: ParsedSegment[] = [];
  let lastIndex = 0;

  for (const match of matches) {
    // 매칭 이전의 텍스트
    if (match.start > lastIndex) {
      segments.push({
        type: 'text',
        content: text.slice(lastIndex, match.start),
      });
    }

    // 매칭된 용어
    segments.push({
      type: 'term',
      content: match.matchedText,
      term: match.term,
    });

    lastIndex = match.end;
  }

  // 마지막 매칭 이후의 텍스트
  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      content: text.slice(lastIndex),
    });
  }

  return segments;
}

/**
 * 텍스트에 용어사전 용어가 포함되어 있는지 확인
 *
 * @param text 검색할 텍스트
 * @returns 용어 포함 여부
 */
export function hasGlossaryTerms(text: string): boolean {
  return findTermMatches(text).length > 0;
}

/**
 * 텍스트에서 발견된 용어 목록 반환
 *
 * @param text 검색할 텍스트
 * @returns 발견된 용어 배열 (중복 제거)
 */
export function extractGlossaryTerms(text: string): GlossaryTerm[] {
  const matches = findTermMatches(text);
  const uniqueTerms = new Map<string, GlossaryTerm>();

  for (const match of matches) {
    uniqueTerms.set(match.term.id, match.term);
  }

  return Array.from(uniqueTerms.values());
}

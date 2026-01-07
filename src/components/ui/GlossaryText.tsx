'use client';

/**
 * 용어사전 텍스트 래퍼 컴포넌트
 *
 * 텍스트를 자동으로 파싱하여 용어사전 용어에
 * 툴팁을 적용합니다.
 *
 * @example
 * <GlossaryText>
 *   Fed가 CPI 발표 후 금리를 인상했습니다.
 * </GlossaryText>
 */

import { useMemo } from 'react';
import { parseTextWithGlossary } from '@/lib/glossaryParser';
import { GlossaryTooltip } from '@/components/common';

interface GlossaryTextProps {
  /** 파싱할 텍스트 */
  children: string;
  /** 추가 CSS 클래스 */
  className?: string;
  /** 텍스트를 감싸는 컨테이너 태그 (기본값: span) */
  as?: 'span' | 'p' | 'div';
}

export function GlossaryText({
  children,
  className,
  as: Component = 'span',
}: GlossaryTextProps) {
  // 텍스트 파싱 (메모이제이션)
  const segments = useMemo(() => {
    if (typeof children !== 'string') {
      return [{ type: 'text' as const, content: String(children) }];
    }
    return parseTextWithGlossary(children);
  }, [children]);

  // 용어가 없으면 그대로 반환
  const hasTerms = segments.some((s) => s.type === 'term');
  if (!hasTerms) {
    return <Component className={className}>{children}</Component>;
  }

  return (
    <Component className={className}>
      {segments.map((segment, index) => {
        if (segment.type === 'term' && segment.term) {
          return (
            <GlossaryTooltip key={`${segment.term.id}-${index}`} term={segment.term.abbreviation}>
              {segment.content}
            </GlossaryTooltip>
          );
        }
        return <span key={index}>{segment.content}</span>;
      })}
    </Component>
  );
}

/**
 * 텍스트 배열을 용어사전 적용하여 렌더링
 *
 * 여러 줄의 텍스트나 배열 형태의 콘텐츠에 사용
 */
interface GlossaryTextArrayProps {
  texts: string[];
  separator?: React.ReactNode;
  className?: string;
}

export function GlossaryTextArray({
  texts,
  separator = ' ',
  className,
}: GlossaryTextArrayProps) {
  return (
    <span className={className}>
      {texts.map((text, index) => (
        <span key={index}>
          <GlossaryText>{text}</GlossaryText>
          {index < texts.length - 1 && separator}
        </span>
      ))}
    </span>
  );
}

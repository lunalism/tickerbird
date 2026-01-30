'use client';

/**
 * ResizableImage - Tiptap 이미지 드래그 리사이즈 확장
 *
 * 이미지 선택 시 4개 모서리에 리사이즈 핸들을 표시합니다.
 * - 핸들 드래그로 자유롭게 크기 조절
 * - Shift 키 누르면 비율 유지
 * - 삭제 버튼으로 이미지 제거
 *
 * @see https://tiptap.dev/docs/editor/extensions/nodes/image
 */

import { Node, mergeAttributes, CommandProps } from '@tiptap/core';
import { NodeViewWrapper, NodeViewProps, ReactNodeViewRenderer } from '@tiptap/react';
import { useState, useRef, useCallback, useEffect } from 'react';

// ============================================
// TypeScript 타입 확장
// ============================================

/**
 * setImage 커맨드의 옵션 타입
 */
interface SetImageOptions {
  src: string;
  alt?: string;
  title?: string;
  width?: string;
}

/**
 * 리사이즈 핸들 위치 타입
 * - nw: 좌상단 (north-west)
 * - ne: 우상단 (north-east)
 * - sw: 좌하단 (south-west)
 * - se: 우하단 (south-east)
 */
type HandlePosition = 'nw' | 'ne' | 'sw' | 'se';

/**
 * Tiptap Commands 인터페이스 확장
 * setImage 커맨드를 전역으로 사용할 수 있도록 선언
 */
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    resizableImage: {
      /**
       * 이미지를 삽입합니다.
       */
      setImage: (options: SetImageOptions) => ReturnType;
    };
  }
}

// ============================================
// 이미지 노드뷰 컴포넌트 (리사이즈 UI 포함)
// ============================================

/**
 * 이미지 리사이즈 컴포넌트
 *
 * 이미지 클릭 시 4개 모서리에 리사이즈 핸들을 표시하고,
 * 드래그로 크기를 조절할 수 있습니다.
 */
function ResizableImageComponent({ node, updateAttributes, selected, deleteNode }: NodeViewProps) {
  // ========================================
  // 상태 관리
  // ========================================

  // 드래그 상태
  const [isResizing, setIsResizing] = useState(false);
  // 현재 드래그 중인 핸들 위치
  const [activeHandle, setActiveHandle] = useState<HandlePosition | null>(null);
  // 드래그 시작 시 이미지 크기
  const [startSize, setStartSize] = useState({ width: 0, height: 0 });
  // 드래그 시작 시 마우스 위치
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  // 원본 이미지 비율
  const [aspectRatio, setAspectRatio] = useState(1);
  // 현재 표시 크기
  const [displaySize, setDisplaySize] = useState<{ width: number; height: number } | null>(null);

  // 이미지 참조
  const imageRef = useRef<HTMLImageElement>(null);

  // 속성에서 값 추출
  const { src, alt, width } = node.attrs;

  // ========================================
  // 이미지 로드 핸들러
  // ========================================

  /**
   * 이미지 로드 완료 시 비율 계산 및 크기 설정
   */
  const handleImageLoad = useCallback(() => {
    if (imageRef.current) {
      const img = imageRef.current;
      // 원본 이미지 비율 저장
      setAspectRatio(img.naturalWidth / img.naturalHeight);
      // 현재 표시 크기 저장
      setDisplaySize({
        width: img.offsetWidth,
        height: img.offsetHeight,
      });
    }
  }, []);

  // 너비 변경 시 표시 크기 업데이트
  useEffect(() => {
    if (imageRef.current && imageRef.current.complete) {
      setDisplaySize({
        width: imageRef.current.offsetWidth,
        height: imageRef.current.offsetHeight,
      });
    }
  }, [width]);

  // ========================================
  // 드래그 리사이즈 핸들러
  // ========================================

  /**
   * 리사이즈 핸들 마우스 다운 - 드래그 시작
   */
  const handleMouseDown = useCallback(
    (e: React.MouseEvent, position: HandlePosition) => {
      e.preventDefault();
      e.stopPropagation();

      if (!imageRef.current) return;

      // 드래그 상태 시작
      setIsResizing(true);
      setActiveHandle(position);

      // 시작 위치 및 크기 저장
      setStartPos({ x: e.clientX, y: e.clientY });
      setStartSize({
        width: imageRef.current.offsetWidth,
        height: imageRef.current.offsetHeight,
      });
    },
    []
  );

  /**
   * 마우스 이동 및 마우스 업 이벤트 처리
   */
  useEffect(() => {
    if (!isResizing || !activeHandle) return;

    /**
     * 마우스 이동 - 크기 계산 및 업데이트
     */
    const handleMouseMove = (e: MouseEvent) => {
      // 마우스 이동량 계산
      const deltaX = e.clientX - startPos.x;
      const deltaY = e.clientY - startPos.y;

      let newWidth = startSize.width;
      let newHeight = startSize.height;

      // 핸들 위치에 따른 크기 계산
      switch (activeHandle) {
        case 'se': // 우하단: 우측+하단으로 확장
          newWidth = startSize.width + deltaX;
          newHeight = startSize.height + deltaY;
          break;
        case 'sw': // 좌하단: 좌측+하단으로 확장
          newWidth = startSize.width - deltaX;
          newHeight = startSize.height + deltaY;
          break;
        case 'ne': // 우상단: 우측+상단으로 확장
          newWidth = startSize.width + deltaX;
          newHeight = startSize.height - deltaY;
          break;
        case 'nw': // 좌상단: 좌측+상단으로 확장
          newWidth = startSize.width - deltaX;
          newHeight = startSize.height - deltaY;
          break;
      }

      // Shift 키를 누르고 있으면 비율 유지
      if (e.shiftKey) {
        // 너비 기준으로 높이 계산
        newHeight = newWidth / aspectRatio;
      }

      // 최소 크기 제한 (50px)
      newWidth = Math.max(50, newWidth);
      newHeight = Math.max(50, newHeight);

      // 에디터에 너비 업데이트 (높이는 auto로 비율 유지)
      updateAttributes({ width: `${Math.round(newWidth)}px` });

      // 표시 크기 업데이트
      setDisplaySize({ width: Math.round(newWidth), height: Math.round(newHeight) });
    };

    /**
     * 마우스 업 - 드래그 종료
     */
    const handleMouseUp = () => {
      setIsResizing(false);
      setActiveHandle(null);
    };

    // 이벤트 리스너 등록
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    // 클린업
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, activeHandle, startPos, startSize, aspectRatio, updateAttributes]);

  // ========================================
  // 렌더링
  // ========================================

  return (
    <NodeViewWrapper className="my-4" style={{ display: 'inline-block' }}>
      <div
        className={`
          relative inline-block
          ${selected ? 'outline outline-2 outline-blue-500 outline-offset-2' : ''}
          ${isResizing ? 'select-none cursor-crosshair' : ''}
        `}
        style={{ lineHeight: 0 }}
      >
        {/* 이미지 */}
        <img
          ref={imageRef}
          src={src}
          alt={alt || ''}
          onLoad={handleImageLoad}
          style={{
            width: width === 'auto' ? 'auto' : width,
            maxWidth: '100%',
            height: 'auto',
            display: 'block',
          }}
          className="rounded-lg"
          draggable={false}
        />

        {/* 선택 시 리사이즈 핸들 표시 */}
        {selected && (
          <>
            {/* 리사이즈 핸들 - 좌상단 (nw) */}
            <div
              onMouseDown={(e) => handleMouseDown(e, 'nw')}
              className={`
                absolute -top-1.5 -left-1.5 w-3 h-3
                bg-blue-500 border-2 border-white rounded-sm
                cursor-nw-resize shadow-md
                hover:bg-blue-600 transition-colors
                ${activeHandle === 'nw' ? 'bg-blue-600 scale-110' : ''}
              `}
              title="드래그하여 크기 조절 (Shift: 비율 유지)"
            />

            {/* 리사이즈 핸들 - 우상단 (ne) */}
            <div
              onMouseDown={(e) => handleMouseDown(e, 'ne')}
              className={`
                absolute -top-1.5 -right-1.5 w-3 h-3
                bg-blue-500 border-2 border-white rounded-sm
                cursor-ne-resize shadow-md
                hover:bg-blue-600 transition-colors
                ${activeHandle === 'ne' ? 'bg-blue-600 scale-110' : ''}
              `}
              title="드래그하여 크기 조절 (Shift: 비율 유지)"
            />

            {/* 리사이즈 핸들 - 좌하단 (sw) */}
            <div
              onMouseDown={(e) => handleMouseDown(e, 'sw')}
              className={`
                absolute -bottom-1.5 -left-1.5 w-3 h-3
                bg-blue-500 border-2 border-white rounded-sm
                cursor-sw-resize shadow-md
                hover:bg-blue-600 transition-colors
                ${activeHandle === 'sw' ? 'bg-blue-600 scale-110' : ''}
              `}
              title="드래그하여 크기 조절 (Shift: 비율 유지)"
            />

            {/* 리사이즈 핸들 - 우하단 (se) */}
            <div
              onMouseDown={(e) => handleMouseDown(e, 'se')}
              className={`
                absolute -bottom-1.5 -right-1.5 w-3 h-3
                bg-blue-500 border-2 border-white rounded-sm
                cursor-se-resize shadow-md
                hover:bg-blue-600 transition-colors
                ${activeHandle === 'se' ? 'bg-blue-600 scale-110' : ''}
              `}
              title="드래그하여 크기 조절 (Shift: 비율 유지)"
            />

            {/* 삭제 버튼 */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                deleteNode();
              }}
              className="
                absolute -top-3 -right-3 w-6 h-6
                bg-red-500 rounded-full
                flex items-center justify-center
                hover:bg-red-600 transition-colors
                shadow-md z-10
              "
              title="이미지 삭제"
            >
              <svg
                className="w-3 h-3 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            {/* 현재 크기 표시 (리사이즈 중에만) */}
            {isResizing && displaySize && (
              <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-900/90 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                {displaySize.width} × {displaySize.height}px
              </div>
            )}
          </>
        )}
      </div>
    </NodeViewWrapper>
  );
}

// ============================================
// Tiptap 확장 정의
// ============================================

/**
 * ResizableImage 확장
 *
 * 기본 Image 확장을 대체하여 드래그 리사이즈 기능을 추가합니다.
 */
export const ResizableImage = Node.create({
  name: 'image',

  // 블록 요소로 설정
  group: 'block',

  // 이미지 노드는 자식을 가지지 않음 (atom)
  atom: true,

  // 드래그 가능
  draggable: true,

  /**
   * 속성 정의
   */
  addAttributes() {
    return {
      // 이미지 URL
      src: {
        default: null,
      },
      // 대체 텍스트
      alt: {
        default: null,
      },
      // 제목
      title: {
        default: null,
      },
      // 너비 (리사이즈용)
      width: {
        default: 'auto',
        // HTML에서 렌더링할 때 style 속성으로 변환
        renderHTML: (attributes) => {
          if (!attributes.width || attributes.width === 'auto') {
            return {};
          }
          return {
            style: `width: ${attributes.width}`,
          };
        },
        // HTML 파싱 시 style에서 width 추출
        parseHTML: (element) => {
          const width = element.style.width || element.getAttribute('width');
          return width || 'auto';
        },
      },
    };
  },

  /**
   * HTML 파싱 규칙
   */
  parseHTML() {
    return [
      {
        tag: 'img[src]',
      },
    ];
  },

  /**
   * HTML 렌더링 규칙
   */
  renderHTML({ HTMLAttributes }) {
    return [
      'img',
      mergeAttributes(
        {
          class: 'max-w-full h-auto rounded-lg',
        },
        HTMLAttributes
      ),
    ];
  },

  /**
   * React 노드뷰 사용
   */
  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageComponent);
  },

  /**
   * 명령어 추가
   */
  addCommands() {
    return {
      setImage:
        (options: SetImageOptions) =>
        ({ commands }: CommandProps) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    };
  },
});

export default ResizableImage;

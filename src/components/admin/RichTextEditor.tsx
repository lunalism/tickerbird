'use client';

/**
 * RichTextEditor - Tiptap 기반 리치 텍스트 에디터
 *
 * 개인정보처리방침, 이용약관 등의 콘텐츠를 WYSIWYG 방식으로 편집합니다.
 *
 * 기능:
 * - 텍스트 서식: 굵게, 기울임, 밑줄
 * - 제목: H1, H2, H3
 * - 목록: 순서 있는 목록, 순서 없는 목록
 * - 링크: URL 링크 추가/제거
 */

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import { useCallback, useEffect } from 'react';

// ============================================
// 타입 정의
// ============================================

interface RichTextEditorProps {
  /** 에디터 내용 (HTML 형식) */
  content: string;
  /** 내용 변경 시 콜백 */
  onChange: (html: string) => void;
  /** 플레이스홀더 텍스트 */
  placeholder?: string;
}

// ============================================
// 툴바 버튼 컴포넌트
// ============================================

interface ToolbarButtonProps {
  /** 버튼 활성화 상태 */
  isActive?: boolean;
  /** 클릭 핸들러 */
  onClick: () => void;
  /** 버튼 내용 */
  children: React.ReactNode;
  /** 버튼 비활성화 여부 */
  disabled?: boolean;
  /** 툴팁 텍스트 */
  title?: string;
}

/**
 * 툴바 버튼 컴포넌트
 * 활성화 상태에 따라 스타일이 변경됩니다.
 */
function ToolbarButton({
  isActive = false,
  onClick,
  children,
  disabled = false,
  title,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`
        px-2.5 py-1.5 rounded-md text-sm font-medium transition-colors
        ${
          isActive
            ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
        }
        disabled:opacity-50 disabled:cursor-not-allowed
      `}
    >
      {children}
    </button>
  );
}

/**
 * 툴바 구분선 컴포넌트
 */
function ToolbarDivider() {
  return <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />;
}

// ============================================
// 메인 에디터 컴포넌트
// ============================================

export function RichTextEditor({
  content,
  onChange,
  placeholder = '내용을 입력하세요...',
}: RichTextEditorProps) {
  // Tiptap 에디터 인스턴스 생성
  const editor = useEditor({
    extensions: [
      // 기본 확장팩 (제목, 목록, 굵게, 기울임 등)
      StarterKit.configure({
        // 제목 레벨 제한 (H1, H2, H3만 사용)
        heading: {
          levels: [1, 2, 3],
        },
      }),
      // 밑줄 확장
      Underline,
      // 링크 확장
      Link.configure({
        // 링크 클릭 시 새 탭에서 열기
        openOnClick: false,
        // 링크에 자동으로 https 추가
        autolink: true,
        // 기본 프로토콜
        defaultProtocol: 'https',
        HTMLAttributes: {
          class: 'text-blue-600 dark:text-blue-400 underline hover:text-blue-800 dark:hover:text-blue-300',
        },
      }),
    ],
    content,
    // 내용 변경 시 콜백 호출
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    // 에디터 스타일 설정
    editorProps: {
      attributes: {
        class: 'prose prose-gray dark:prose-invert max-w-none focus:outline-none min-h-[400px] px-4 py-3',
      },
    },
  });

  // 외부에서 content가 변경되면 에디터 내용 업데이트
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  /**
   * 링크 추가/수정 핸들러
   * 프롬프트로 URL을 입력받아 선택된 텍스트에 링크를 적용합니다.
   */
  const setLink = useCallback(() => {
    if (!editor) return;

    // 현재 선택된 텍스트의 링크 URL 가져오기
    const previousUrl = editor.getAttributes('link').href;

    // URL 입력 프롬프트
    const url = window.prompt('링크 URL을 입력하세요:', previousUrl || 'https://');

    // 취소 버튼 클릭 시
    if (url === null) return;

    // 빈 URL 입력 시 링크 제거
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    // 링크 적용
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  // 에디터가 아직 초기화되지 않은 경우
  if (!editor) {
    return (
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="h-12 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 animate-pulse" />
        <div className="min-h-[400px] bg-white dark:bg-gray-800 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      {/* ========================================
          툴바 영역
          - 텍스트 서식, 제목, 목록, 링크 버튼
          ======================================== */}
      <div className="flex flex-wrap items-center gap-0.5 p-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        {/* 텍스트 서식 그룹 */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          title="굵게 (Ctrl+B)"
        >
          <span className="font-bold">B</span>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          title="기울임 (Ctrl+I)"
        >
          <span className="italic">I</span>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive('underline')}
          title="밑줄 (Ctrl+U)"
        >
          <span className="underline">U</span>
        </ToolbarButton>

        <ToolbarDivider />

        {/* 제목 그룹 */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive('heading', { level: 1 })}
          title="제목 1"
        >
          H1
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive('heading', { level: 2 })}
          title="제목 2"
        >
          H2
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor.isActive('heading', { level: 3 })}
          title="제목 3"
        >
          H3
        </ToolbarButton>

        <ToolbarDivider />

        {/* 목록 그룹 */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          title="순서 없는 목록"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          title="순서 있는 목록"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
          </svg>
        </ToolbarButton>

        <ToolbarDivider />

        {/* 링크 버튼 */}
        <ToolbarButton
          onClick={setLink}
          isActive={editor.isActive('link')}
          title="링크 추가"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </ToolbarButton>

        {/* 링크 제거 버튼 (링크가 선택된 경우에만 표시) */}
        {editor.isActive('link') && (
          <ToolbarButton
            onClick={() => editor.chain().focus().unsetLink().run()}
            title="링크 제거"
          >
            <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </ToolbarButton>
        )}
      </div>

      {/* ========================================
          에디터 영역
          - Tiptap EditorContent 컴포넌트
          ======================================== */}
      <div className="bg-white dark:bg-gray-800">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

export default RichTextEditor;

'use client';

/**
 * RichTextEditor - Tiptap 기반 리치 텍스트 에디터
 *
 * 개인정보처리방침, 이용약관 등의 콘텐츠를 WYSIWYG 방식으로 편집합니다.
 *
 * 기능:
 * - 실행취소/다시실행: Undo, Redo
 * - 텍스트 서식: 굵게, 기울임, 밑줄, 취소선
 * - 제목: H1, H2, H3
 * - 목록: 순서 없는 목록, 순서 있는 목록
 * - 인용: Blockquote
 * - 구분선: Horizontal Rule
 * - 링크: URL 링크 추가/제거
 * - 테이블: 삽입, 행/열 추가/삭제
 * - 정렬: 좌/중앙/우 정렬
 * - 이미지: Firebase Storage 업로드 및 삽입
 * - 높이 고정 + 스크롤
 */

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { useCallback, useEffect, useState, useRef } from 'react';
import { uploadImage, getAllowedImageTypes } from '@/lib/uploadImage';

// ============================================
// 타입 정의
// ============================================

/** 이미지 업로드 시 사용할 컨텐츠 타입 */
type ContentType = 'announcements' | 'faq' | 'general';

interface RichTextEditorProps {
  /** 에디터 내용 (HTML 형식) */
  content: string;
  /** 내용 변경 시 콜백 */
  onChange: (html: string) => void;
  /** 플레이스홀더 텍스트 */
  placeholder?: string;
  /** 이미지 업로드 시 저장 경로 (기본: 'general') */
  contentType?: ContentType;
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
        p-1.5 rounded-md text-sm font-medium transition-colors
        ${
          isActive
            ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
        }
        disabled:opacity-40 disabled:cursor-not-allowed
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
// 아이콘 컴포넌트들
// ============================================

/** 실행취소 아이콘 */
const UndoIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
  </svg>
);

/** 다시실행 아이콘 */
const RedoIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
  </svg>
);

/** 취소선 아이콘 */
const StrikeIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.154 14c.23.516.346 1.09.346 1.72 0 1.342-.524 2.392-1.571 3.147C14.88 19.622 13.433 20 11.586 20c-1.64 0-3.263-.381-4.87-1.144V16.6c1.52.877 3.075 1.316 4.666 1.316 2.551 0 3.83-.732 3.839-2.197a2.21 2.21 0 00-.648-1.603l-.12-.117H3v-2h18v2h-3.846zm-4.078-3H7.629a4.086 4.086 0 01-.481-.522C6.716 9.92 6.5 9.246 6.5 8.452c0-1.236.466-2.287 1.397-3.153C8.83 4.433 10.271 4 12.222 4c1.471 0 2.879.328 4.222.984v2.152c-1.2-.687-2.515-1.03-3.946-1.03-2.48 0-3.719.782-3.719 2.346 0 .42.218.786.654 1.099.436.313.974.562 1.613.75.62.18 1.297.414 2.03.699z" />
  </svg>
);

/** 순서 없는 목록 아이콘 */
const BulletListIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

/** 순서 있는 목록 아이콘 */
const OrderedListIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 4h13v2H8V4zM5 3v3h1v1H3V6h1V4H3V3h2zM3 14v-2.5h2V11H3v-1h3v2.5H4v.5h2v1H3zm2 5.5H3v-1h2V18H3v-1h3v4H3v-1h2v-.5zM8 11h13v2H8v-2zm0 7h13v2H8v-2z" />
  </svg>
);

/** 인용 아이콘 */
const BlockquoteIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179z" />
  </svg>
);

/** 구분선 아이콘 */
const HorizontalRuleIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
  </svg>
);

/** 링크 아이콘 */
const LinkIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
  </svg>
);

/** 테이블 아이콘 */
const TableIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M10 3v18M14 3v18M3 6a3 3 0 013-3h12a3 3 0 013 3v12a3 3 0 01-3 3H6a3 3 0 01-3-3V6z" />
  </svg>
);

/** 좌측 정렬 아이콘 */
const AlignLeftIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h10M4 18h14" />
  </svg>
);

/** 중앙 정렬 아이콘 */
const AlignCenterIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M7 12h10M5 18h14" />
  </svg>
);

/** 우측 정렬 아이콘 */
const AlignRightIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M10 12h10M6 18h14" />
  </svg>
);

/** 이미지 아이콘 */
const ImageIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

/** 로딩 스피너 아이콘 */
const LoadingIcon = () => (
  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

// ============================================
// 테이블 드롭다운 메뉴 컴포넌트
// ============================================

interface TableMenuProps {
  /** 메뉴 열림 상태 */
  isOpen: boolean;
  /** 메뉴 닫기 핸들러 */
  onClose: () => void;
  /** 테이블 삽입 핸들러 */
  onInsertTable: () => void;
  /** 행 위에 추가 */
  onAddRowBefore: () => void;
  /** 행 아래에 추가 */
  onAddRowAfter: () => void;
  /** 행 삭제 */
  onDeleteRow: () => void;
  /** 열 왼쪽에 추가 */
  onAddColumnBefore: () => void;
  /** 열 오른쪽에 추가 */
  onAddColumnAfter: () => void;
  /** 열 삭제 */
  onDeleteColumn: () => void;
  /** 테이블 삭제 */
  onDeleteTable: () => void;
  /** 테이블 선택 여부 */
  isInTable: boolean;
}

/**
 * 테이블 작업 드롭다운 메뉴
 */
function TableMenu({
  isOpen,
  onClose,
  onInsertTable,
  onAddRowBefore,
  onAddRowAfter,
  onDeleteRow,
  onAddColumnBefore,
  onAddColumnAfter,
  onDeleteColumn,
  onDeleteTable,
  isInTable,
}: TableMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50"
    >
      <div className="py-1">
        {/* 테이블 삽입 */}
        <button
          type="button"
          onClick={() => {
            onInsertTable();
            onClose();
          }}
          className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          테이블 삽입 (3x3)
        </button>

        {/* 테이블 내부에서만 표시되는 메뉴 */}
        {isInTable && (
          <>
            <div className="border-t border-gray-100 dark:border-gray-700 my-1" />

            {/* 행 관련 */}
            <button
              type="button"
              onClick={() => {
                onAddRowBefore();
                onClose();
              }}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              행 위에 추가
            </button>
            <button
              type="button"
              onClick={() => {
                onAddRowAfter();
                onClose();
              }}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              행 아래에 추가
            </button>
            <button
              type="button"
              onClick={() => {
                onDeleteRow();
                onClose();
              }}
              className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              행 삭제
            </button>

            <div className="border-t border-gray-100 dark:border-gray-700 my-1" />

            {/* 열 관련 */}
            <button
              type="button"
              onClick={() => {
                onAddColumnBefore();
                onClose();
              }}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              열 왼쪽에 추가
            </button>
            <button
              type="button"
              onClick={() => {
                onAddColumnAfter();
                onClose();
              }}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              열 오른쪽에 추가
            </button>
            <button
              type="button"
              onClick={() => {
                onDeleteColumn();
                onClose();
              }}
              className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              열 삭제
            </button>

            <div className="border-t border-gray-100 dark:border-gray-700 my-1" />

            {/* 테이블 삭제 */}
            <button
              type="button"
              onClick={() => {
                onDeleteTable();
                onClose();
              }}
              className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              테이블 삭제
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================
// 메인 에디터 컴포넌트
// ============================================

export function RichTextEditor({
  content,
  onChange,
  placeholder = '내용을 입력하세요...',
  contentType = 'general',
}: RichTextEditorProps) {
  // 테이블 메뉴 열림 상태
  const [isTableMenuOpen, setIsTableMenuOpen] = useState(false);

  // 이미지 업로드 상태
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // 파일 입력 참조
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 이미지 삽입 위치 저장 (파일 선택 전 커서 위치)
  // 파일 다이얼로그가 열리면 에디터가 포커스를 잃으므로 미리 저장해둠
  const savedSelectionRef = useRef<{ from: number; to: number } | null>(null);

  // Tiptap 에디터 인스턴스 생성
  const editor = useEditor({
    extensions: [
      // 기본 확장팩 (제목, 목록, 굵게, 기울임, 취소선, 인용, 구분선 등)
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        blockquote: {},
        horizontalRule: {},
        codeBlock: false,
      }),
      // 밑줄 확장
      Underline,
      // 링크 확장
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: 'https',
        HTMLAttributes: {
          class: 'text-blue-600 dark:text-blue-400 underline hover:text-blue-800 dark:hover:text-blue-300',
        },
      }),
      // 이미지 확장
      Image.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg my-4',
        },
      }),
      // 텍스트 정렬 확장
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      // 플레이스홀더 확장
      Placeholder.configure({
        placeholder,
      }),
      // 테이블 확장
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'tiptap-table',
        },
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
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
   */
  const setLink = useCallback(() => {
    if (!editor) return;

    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('링크 URL을 입력하세요:', previousUrl || 'https://');

    if (url === null) return;

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  /**
   * 이미지 버튼 클릭 핸들러
   *
   * 파일 다이얼로그를 열기 전에 현재 커서 위치를 저장합니다.
   * 이렇게 해야 이미지가 사용자가 원하는 위치(글 중간)에 삽입됩니다.
   */
  const handleImageButtonClick = useCallback(() => {
    if (!editor) return;

    // 현재 선택 영역(커서 위치) 저장
    // 파일 다이얼로그가 열리면 에디터가 포커스를 잃어서 선택이 사라짐
    const { from, to } = editor.state.selection;
    savedSelectionRef.current = { from, to };

    console.log('[RichTextEditor] 커서 위치 저장:', { from, to });

    // 파일 선택 다이얼로그 열기
    fileInputRef.current?.click();
  }, [editor]);

  /**
   * 이미지 파일 선택 핸들러
   *
   * 파일을 Firebase Storage에 업로드하고 에디터의 저장된 커서 위치에 삽입합니다.
   * 커서 위치는 handleImageButtonClick에서 미리 저장해둔 값을 사용합니다.
   */
  const handleImageUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!editor) return;

      const file = event.target.files?.[0];
      if (!file) return;

      // 파일 입력 초기화 (같은 파일 다시 선택 가능하게)
      event.target.value = '';

      // 업로드 상태 시작
      setIsUploading(true);
      setUploadError(null);

      try {
        // Firebase Storage에 업로드
        const result = await uploadImage(file, contentType);

        if (result.success) {
          // 저장해둔 커서 위치 복원 후 이미지 삽입
          // 이렇게 해야 글 중간에도 이미지가 삽입됨
          const savedSelection = savedSelectionRef.current;

          if (savedSelection) {
            // 저장된 위치로 커서 이동 후 이미지 삽입
            console.log('[RichTextEditor] 저장된 위치에 이미지 삽입:', savedSelection);

            editor
              .chain()
              .focus()
              .setTextSelection(savedSelection.from)
              .setImage({
                src: result.url,
                alt: result.filename,
              })
              .run();
          } else {
            // 저장된 위치가 없으면 현재 위치에 삽입
            console.log('[RichTextEditor] 현재 위치에 이미지 삽입');

            editor
              .chain()
              .focus()
              .setImage({
                src: result.url,
                alt: result.filename,
              })
              .run();
          }

          // 저장된 위치 초기화
          savedSelectionRef.current = null;

          console.log('[RichTextEditor] 이미지 삽입 완료:', result.url);
        } else {
          // 업로드 실패
          setUploadError(result.error);
          console.error('[RichTextEditor] 이미지 업로드 실패:', result.error);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
        setUploadError(errorMessage);
        console.error('[RichTextEditor] 이미지 업로드 오류:', error);
      } finally {
        setIsUploading(false);
      }
    },
    [editor, contentType]
  );

  /**
   * 에러 메시지 닫기
   */
  const clearUploadError = useCallback(() => {
    setUploadError(null);
  }, []);

  // 에디터가 아직 초기화되지 않은 경우
  if (!editor) {
    return (
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="h-12 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 animate-pulse" />
        <div className="h-[500px] bg-white dark:bg-gray-800 animate-pulse" />
      </div>
    );
  }

  // 현재 커서가 테이블 안에 있는지 확인
  const isInTable = editor.isActive('table');

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      {/* ========================================
          툴바 영역 (상단 고정)
          ======================================== */}
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 p-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        {/* 실행취소/다시실행 그룹 */}
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="실행취소 (Ctrl+Z)"
        >
          <UndoIcon />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="다시실행 (Ctrl+Y)"
        >
          <RedoIcon />
        </ToolbarButton>

        <ToolbarDivider />

        {/* 텍스트 서식 그룹 */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          title="굵게 (Ctrl+B)"
        >
          <span className="font-bold text-sm">B</span>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          title="기울임 (Ctrl+I)"
        >
          <span className="italic text-sm">I</span>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive('underline')}
          title="밑줄 (Ctrl+U)"
        >
          <span className="underline text-sm">U</span>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive('strike')}
          title="취소선"
        >
          <StrikeIcon />
        </ToolbarButton>

        <ToolbarDivider />

        {/* 제목 그룹 */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive('heading', { level: 1 })}
          title="제목 1"
        >
          <span className="text-xs font-bold">H1</span>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive('heading', { level: 2 })}
          title="제목 2"
        >
          <span className="text-xs font-bold">H2</span>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor.isActive('heading', { level: 3 })}
          title="제목 3"
        >
          <span className="text-xs font-bold">H3</span>
        </ToolbarButton>

        <ToolbarDivider />

        {/* 목록/인용 그룹 */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          title="순서 없는 목록"
        >
          <BulletListIcon />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          title="순서 있는 목록"
        >
          <OrderedListIcon />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive('blockquote')}
          title="인용"
        >
          <BlockquoteIcon />
        </ToolbarButton>

        <ToolbarDivider />

        {/* 구분선/링크/테이블 그룹 */}
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="구분선 삽입"
        >
          <HorizontalRuleIcon />
        </ToolbarButton>
        <ToolbarButton
          onClick={setLink}
          isActive={editor.isActive('link')}
          title="링크 추가"
        >
          <LinkIcon />
        </ToolbarButton>

        {/* 링크 제거 버튼 */}
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

        {/* 테이블 버튼 (드롭다운) */}
        <div className="relative">
          <ToolbarButton
            onClick={() => setIsTableMenuOpen(!isTableMenuOpen)}
            isActive={isInTable}
            title="테이블"
          >
            <TableIcon />
          </ToolbarButton>

          <TableMenu
            isOpen={isTableMenuOpen}
            onClose={() => setIsTableMenuOpen(false)}
            onInsertTable={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
            onAddRowBefore={() => editor.chain().focus().addRowBefore().run()}
            onAddRowAfter={() => editor.chain().focus().addRowAfter().run()}
            onDeleteRow={() => editor.chain().focus().deleteRow().run()}
            onAddColumnBefore={() => editor.chain().focus().addColumnBefore().run()}
            onAddColumnAfter={() => editor.chain().focus().addColumnAfter().run()}
            onDeleteColumn={() => editor.chain().focus().deleteColumn().run()}
            onDeleteTable={() => editor.chain().focus().deleteTable().run()}
            isInTable={isInTable}
          />
        </div>

        {/* 이미지 업로드 버튼 */}
        <ToolbarButton
          onClick={handleImageButtonClick}
          disabled={isUploading}
          title="이미지 삽입 (최대 5MB)"
        >
          {isUploading ? <LoadingIcon /> : <ImageIcon />}
        </ToolbarButton>

        {/* 숨겨진 파일 입력 */}
        <input
          ref={fileInputRef}
          type="file"
          accept={getAllowedImageTypes()}
          onChange={handleImageUpload}
          className="hidden"
          aria-label="이미지 파일 선택"
        />

        <ToolbarDivider />

        {/* 정렬 그룹 */}
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          isActive={editor.isActive({ textAlign: 'left' })}
          title="좌측 정렬"
        >
          <AlignLeftIcon />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          isActive={editor.isActive({ textAlign: 'center' })}
          title="중앙 정렬"
        >
          <AlignCenterIcon />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          isActive={editor.isActive({ textAlign: 'right' })}
          title="우측 정렬"
        >
          <AlignRightIcon />
        </ToolbarButton>
      </div>

      {/* ========================================
          이미지 업로드 에러 메시지
          ======================================== */}
      {uploadError && (
        <div className="flex items-center justify-between px-4 py-2 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
          <span className="text-sm text-red-600 dark:text-red-400">
            {uploadError}
          </span>
          <button
            type="button"
            onClick={clearUploadError}
            className="text-red-500 hover:text-red-700 dark:hover:text-red-300"
            title="닫기"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* ========================================
          이미지 업로드 중 오버레이
          ======================================== */}
      {isUploading && (
        <div className="flex items-center justify-center px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
          <LoadingIcon />
          <span className="ml-2 text-sm text-blue-600 dark:text-blue-400">
            이미지 업로드 중...
          </span>
        </div>
      )}

      {/* ========================================
          에디터 영역
          ======================================== */}
      <div className="bg-white dark:bg-gray-800 max-h-[500px] overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

export default RichTextEditor;

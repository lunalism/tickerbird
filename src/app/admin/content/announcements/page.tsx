'use client';

/**
 * 관리자 - 공지사항 관리 페이지
 *
 * 공지사항 CRUD 기능을 제공합니다.
 * - 목록 조회 (테이블)
 * - 작성/수정/삭제
 * - Tiptap 에디터로 내용 작성
 * - 카테고리, 상단 고정, 발행 설정
 */

import { useState } from 'react';
import Link from 'next/link';
import { useAnnouncements } from '@/hooks/useAnnouncements';
import { useAuth } from '@/components/providers/AuthProvider';
import { RichTextEditor } from '@/components/admin';
import { toast } from 'sonner';
import type {
  Announcement,
  AnnouncementCategory,
  CreateAnnouncementDTO,
  UpdateAnnouncementDTO,
} from '@/types/admin';
import { ANNOUNCEMENT_CATEGORY_INFO } from '@/types/admin';

// ==================== 타입 정의 ====================

type ViewMode = 'list' | 'create' | 'edit';

interface FormData {
  title: string;
  content: string;
  category: AnnouncementCategory;
  isPinned: boolean;
  isPublished: boolean;
}

const initialFormData: FormData = {
  title: '',
  content: '',
  category: 'notice',
  isPinned: false,
  isPublished: false,
};

// ==================== 메인 컴포넌트 ====================

export default function AdminAnnouncementsPage() {
  const { user, userProfile } = useAuth();
  const {
    announcements,
    isLoading,
    error,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
  } = useAnnouncements();

  // ==================== 상태 ====================
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isSaving, setIsSaving] = useState(false);

  // ==================== 폼 핸들러 ====================

  /** 새 공지 작성 모드로 전환 */
  const handleCreate = () => {
    setFormData(initialFormData);
    setEditingId(null);
    setViewMode('create');
  };

  /** 편집 모드로 전환 */
  const handleEdit = (announcement: Announcement) => {
    setFormData({
      title: announcement.title,
      content: announcement.content,
      category: announcement.category,
      isPinned: announcement.isPinned,
      isPublished: announcement.isPublished,
    });
    setEditingId(announcement.id);
    setViewMode('edit');
  };

  /** 목록으로 돌아가기 */
  const handleCancel = () => {
    setFormData(initialFormData);
    setEditingId(null);
    setViewMode('list');
  };

  /** 저장 (생성 또는 수정) */
  const handleSave = async (publish: boolean) => {
    if (!formData.title.trim()) {
      toast.error('제목을 입력해주세요.');
      return;
    }
    if (!formData.content.trim()) {
      toast.error('내용을 입력해주세요.');
      return;
    }

    setIsSaving(true);
    try {
      const data = {
        ...formData,
        isPublished: publish,
      };

      if (viewMode === 'create') {
        // 생성
        await createAnnouncement(
          data as CreateAnnouncementDTO,
          user?.uid || '',
          userProfile?.nickname || userProfile?.email || 'admin'
        );
        toast.success(publish ? '공지사항이 발행되었습니다.' : '임시저장되었습니다.');
      } else {
        // 수정
        await updateAnnouncement(editingId!, data as UpdateAnnouncementDTO);
        toast.success(publish ? '공지사항이 수정되었습니다.' : '임시저장되었습니다.');
      }

      handleCancel();
    } catch (err) {
      toast.error('저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  /** 삭제 */
  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      await deleteAnnouncement(id);
      toast.success('공지사항이 삭제되었습니다.');
    } catch (err) {
      toast.error('삭제에 실패했습니다.');
    }
  };

  // ==================== 로딩 상태 ====================
  if (isLoading) {
    return (
      <div>
        <div className="w-24 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-6" />
        <div className="mb-8">
          <div className="w-48 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
          <div className="w-64 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ==================== 렌더링 ====================
  return (
    <div>
      {/* 뒤로가기 */}
      <Link
        href="/admin/content"
        className="inline-flex items-center gap-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-6 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
        </svg>
        콘텐츠 관리
      </Link>

      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            공지사항 관리
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            공지사항을 작성하고 관리합니다.
          </p>
        </div>
        {viewMode === 'list' && (
          <button
            onClick={handleCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            새 공지 작성
          </button>
        )}
      </div>

      {/* 에러 표시 */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
          {error}
        </div>
      )}

      {/* 목록 뷰 */}
      {viewMode === 'list' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          {announcements.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-4xl mb-4">📢</div>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                아직 공지사항이 없습니다.
              </p>
              <button
                onClick={handleCreate}
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                첫 공지사항 작성하기
              </button>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    상태
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    제목
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    카테고리
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    작성일
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    관리
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {announcements.map((announcement) => {
                  const categoryInfo = ANNOUNCEMENT_CATEGORY_INFO[announcement.category];
                  return (
                    <tr key={announcement.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          {announcement.isPinned && (
                            <span className="text-yellow-500" title="상단 고정">📌</span>
                          )}
                          <span
                            className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                              announcement.isPublished
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                            }`}
                          >
                            {announcement.isPublished ? '발행됨' : '임시저장'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {announcement.title}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                          <span>{categoryInfo.icon}</span>
                          <span>{categoryInfo.label}</span>
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {announcement.createdAt?.toDate?.()?.toLocaleDateString('ko-KR') || '-'}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(announcement)}
                            className="p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                            title="수정"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(announcement.id)}
                            className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
                            title="삭제"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* 작성/수정 폼 */}
      {(viewMode === 'create' || viewMode === 'edit') && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            {viewMode === 'create' ? '새 공지사항 작성' : '공지사항 수정'}
          </h2>

          <div className="space-y-6">
            {/* 제목 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                제목 *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="공지사항 제목을 입력하세요"
              />
            </div>

            {/* 카테고리 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                카테고리
              </label>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(ANNOUNCEMENT_CATEGORY_INFO) as AnnouncementCategory[]).map((cat) => {
                  const info = ANNOUNCEMENT_CATEGORY_INFO[cat];
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setFormData({ ...formData, category: cat })}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition-colors ${
                        formData.category === cat
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      <span>{info.icon}</span>
                      <span>{info.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 옵션 */}
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isPinned}
                  onChange={(e) => setFormData({ ...formData, isPinned: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  📌 상단 고정
                </span>
              </label>
            </div>

            {/* 내용 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                내용 *
              </label>
              <RichTextEditor
                content={formData.content}
                onChange={(html) => setFormData({ ...formData, content: html })}
                placeholder="공지사항 내용을 입력하세요..."
                contentType="announcements"
              />
            </div>

            {/* 버튼 */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => handleSave(false)}
                disabled={isSaving}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
              >
                임시저장
              </button>
              <button
                type="button"
                onClick={() => handleSave(true)}
                disabled={isSaving}
                className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {isSaving ? '저장 중...' : '발행하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 미리보기 링크 */}
      {viewMode === 'list' && announcements.length > 0 && (
        <div className="mt-6">
          <Link
            href="/announcements"
            target="_blank"
            className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            사용자 페이지에서 보기
          </Link>
        </div>
      )}
    </div>
  );
}

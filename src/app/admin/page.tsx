/**
 * 관리자 페이지 루트
 *
 * /admin 접근 시 /admin/dashboard로 리다이렉트합니다.
 */

import { redirect } from 'next/navigation';

export default function AdminPage() {
  redirect('/admin/dashboard');
}

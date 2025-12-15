'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

// 컴포넌트 임포트
import { Sidebar, BottomNav } from '@/components/layout';
import { CategoryIcon, FlagLogo, CompanyLogo } from '@/components/common';

// 스토어 및 유틸리티 임포트
import { useFontSizeStore, FONT_SIZE_MAP } from '@/stores';
import { getCategoryColor } from '@/utils';

// 상수 및 타입 임포트
import { newsData } from '@/constants';
import { NewsItem } from '@/types';

/**
 * 뉴스 상세 페이지 컴포넌트
 *
 * 라우트: /news/[id]
 *
 * 기능:
 * - 뉴스 기사 전문 표시
 * - 사용자 폰트 크기 설정 적용
 * - 좋아요, 북마크 기능
 * - 원문 링크 연결
 * - 관련 뉴스 추천
 */
export default function NewsDetailPage() {
  // 라우터 및 파라미터
  const params = useParams();
  const router = useRouter();
  const newsId = Number(params.id);

  // 사이드바 메뉴 상태
  const [activeMenu, setActiveMenu] = useState('news');

  // 인터랙션 상태
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  // 폰트 크기 설정 (Zustand 스토어에서 가져옴)
  const { titleSize, bodySize } = useFontSizeStore();

  // 뉴스 데이터 조회 (더미 데이터에서)
  const news = newsData.find(item => item.id === newsId);

  // 관련 뉴스 (같은 카테고리, 최대 3개)
  const relatedNews = newsData
    .filter(item => item.id !== newsId && item.category === news?.category)
    .slice(0, 3);

  // 뉴스가 없는 경우 처리
  if (!news) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📰</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            기사를 찾을 수 없습니다
          </h1>
          <p className="text-gray-500 mb-4">
            요청하신 기사가 존재하지 않거나 삭제되었습니다.
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  // 본문 내용 (content가 없으면 summary를 확장해서 사용)
  const articleContent = news.content || `${news.summary}\n\n${generateDummyContent(news)}`;

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      {/* 사이드바 - 데스크톱에서만 표시 */}
      <Sidebar activeMenu={activeMenu} onMenuChange={setActiveMenu} />

      {/* 하단 네비게이션 - 모바일에서만 표시 */}
      <BottomNav activeMenu={activeMenu} onMenuChange={setActiveMenu} />

      {/* 메인 콘텐츠 */}
      <main className="md:pl-[72px] lg:pl-60 transition-all duration-300">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-6">

          {/* 뒤로 가기 버튼 */}
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm font-medium">뒤로 가기</span>
          </button>

          {/* 기사 카드 */}
          <article className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

            {/* 썸네일 이미지 */}
            {news.imageUrl && (
              <div className="relative aspect-video">
                <Image
                  src={news.imageUrl}
                  alt={news.title}
                  fill
                  className="object-cover"
                  priority
                />
                {/* 카테고리 뱃지 (이미지 위) */}
                <div className="absolute top-4 left-4">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium backdrop-blur-sm ${getCategoryColor(news.category)}`}>
                    <CategoryIcon type={news.categoryIcon} />
                    {news.category}
                  </span>
                </div>
                {/* 국기 또는 로고 (이미지 위) */}
                {news.type === 'institution' && news.countryCode ? (
                  <div className="absolute bottom-4 right-4">
                    <FlagLogo countryCode={news.countryCode} size="xl" />
                  </div>
                ) : news.type === 'company' && news.companyDomain ? (
                  <div className="absolute bottom-4 right-4">
                    <CompanyLogo domain={news.companyDomain} size="xl" />
                  </div>
                ) : null}
              </div>
            )}

            {/* 기사 내용 */}
            <div className="p-6 sm:p-8">

              {/* 메타 정보: 출처, 작성시간 */}
              <div className="flex items-center gap-2 mb-4">
                {/* 국기 (인라인) */}
                {news.countryCode && (
                  <FlagLogo countryCode={news.countryCode} size="xs" />
                )}
                <span className="text-sm text-gray-500">
                  {news.countryFlag} {news.source}
                </span>
                <span className="text-gray-300">·</span>
                <span className="text-sm text-gray-400">{news.time}</span>
              </div>

              {/* 제목 - 사용자 폰트 크기 설정 적용 */}
              <h1 className={`${FONT_SIZE_MAP.article.title[titleSize]} font-bold text-gray-900 mb-4 leading-tight`}>
                {news.title}
              </h1>

              {/* 태그 목록 */}
              <div className="flex flex-wrap gap-2 mb-6">
                {news.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-sm text-blue-600 hover:text-blue-700 cursor-pointer transition-colors"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* 구분선 */}
              <hr className="border-gray-100 mb-6" />

              {/* 본문 내용 - 사용자 폰트 크기 설정 적용 */}
              <div className={`${FONT_SIZE_MAP.article.body[bodySize]} text-gray-700 leading-relaxed whitespace-pre-line`}>
                {articleContent}
              </div>

              {/* 구분선 */}
              <hr className="border-gray-100 my-6" />

              {/* 하단 액션 영역 */}
              <div className="flex items-center justify-between">
                {/* 좌측: 좋아요, 댓글, 조회수 */}
                <div className="flex items-center gap-4">
                  {/* 좋아요 버튼 */}
                  <button
                    onClick={() => setLiked(!liked)}
                    className={`flex items-center gap-1.5 text-sm ${
                      liked ? 'text-red-500' : 'text-gray-500'
                    } hover:text-red-500 transition-colors`}
                  >
                    <svg className="w-5 h-5" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    <span>{liked ? news.likes + 1 : news.likes}</span>
                  </button>

                  {/* 댓글 수 */}
                  <span className="flex items-center gap-1.5 text-sm text-gray-500">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span>{news.comments}</span>
                  </span>

                  {/* 조회수 */}
                  <span className="flex items-center gap-1.5 text-sm text-gray-500">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <span>{news.views.toLocaleString()}</span>
                  </span>
                </div>

                {/* 우측: 북마크, 원문 보기 */}
                <div className="flex items-center gap-3">
                  {/* 북마크 버튼 */}
                  <button
                    onClick={() => setBookmarked(!bookmarked)}
                    className={`p-2 rounded-lg transition-colors ${
                      bookmarked
                        ? 'text-blue-500 bg-blue-50'
                        : 'text-gray-400 hover:text-blue-500 hover:bg-gray-50'
                    }`}
                    title="북마크"
                  >
                    <svg className="w-5 h-5" fill={bookmarked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                  </button>

                  {/* 원문 보기 버튼 */}
                  {news.sourceUrl ? (
                    <a
                      href={news.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                    >
                      <span>원문 보기</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  ) : (
                    <span className="px-4 py-2 bg-gray-50 text-gray-400 rounded-lg text-sm">
                      원문 없음
                    </span>
                  )}
                </div>
              </div>
            </div>
          </article>

          {/* 관련 뉴스 섹션 */}
          {relatedNews.length > 0 && (
            <section className="mt-8">
              <h2 className="text-lg font-bold text-gray-900 mb-4">관련 뉴스</h2>
              <div className="space-y-3">
                {relatedNews.map((item) => (
                  <Link
                    key={item.id}
                    href={`/news/${item.id}`}
                    className="block bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex gap-4">
                      {/* 썸네일 */}
                      <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-gray-100">
                        <Image
                          src={item.imageUrl}
                          alt={item.title}
                          width={80}
                          height={80}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      {/* 내용 */}
                      <div className="flex-1 min-w-0">
                        <span className="text-xs text-gray-400">
                          {item.countryFlag} {item.source} · {item.time}
                        </span>
                        <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mt-1">
                          {item.title}
                        </h3>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

/**
 * 더미 본문 콘텐츠 생성 함수
 * 실제 API 연동 전까지 사용할 임시 본문 생성
 */
function generateDummyContent(news: NewsItem): string {
  return `
이 기사는 ${news.category} 카테고리에 해당하는 뉴스입니다.

${news.source}에서 보도한 내용에 따르면, 해당 이슈는 글로벌 금융 시장에 상당한 영향을 미칠 것으로 예상됩니다.

전문가들은 이번 발표가 시장 참여자들에게 중요한 시그널이 될 것이라고 분석했습니다. 특히 단기적으로는 변동성이 확대될 수 있으나, 중장기적으로는 긍정적인 방향으로 작용할 것이라는 전망이 우세합니다.

시장 관계자는 "이번 소식은 투자자들에게 새로운 기회가 될 수 있다"며 "다만 리스크 관리에도 신경을 써야 할 것"이라고 조언했습니다.

한편, 관련 업계에서는 후속 조치에 대한 관심이 높아지고 있으며, 추가적인 발표가 있을 것으로 예상됩니다.

이 기사와 관련된 더 자세한 내용은 원문을 참고하시기 바랍니다.
  `.trim();
}

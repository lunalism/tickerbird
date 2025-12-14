"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

// Company Logo component that fetches from Brandfetch API
function CompanyLogo({ domain }: { domain: string }) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchLogo = async () => {
      try {
        const response = await fetch(`/api/logo/${domain}`);
        if (response.ok) {
          const data = await response.json();
          console.log(`[Logo] ${domain}:`, data.logoUrl);
          setLogoUrl(data.logoUrl);
        } else {
          console.error(`[Logo] ${domain}: API error`, response.status);
          setError(true);
        }
      } catch (err) {
        console.error(`[Logo] ${domain}: Fetch error`, err);
        setError(true);
      }
    };

    fetchLogo();
  }, [domain]);

  // Don't render if no URL or error occurred
  if (!logoUrl || error) {
    return null;
  }

  return (
    <div className="absolute bottom-3 right-3">
      <div className="w-12 h-12 rounded-full bg-white shadow-md flex items-center justify-center p-1">
        <Image
          src={logoUrl}
          alt=""
          width={40}
          height={40}
          sizes="40px"
          className="w-10 h-10 object-contain"
          unoptimized
          onError={() => {
            console.error(`[Logo] ${domain}: Image load error`);
            setError(true);
          }}
        />
      </div>
    </div>
  );
}

// Dummy news data with images for all items
const newsData = [
  {
    id: 1,
    category: "정보",
    categoryIcon: "info",
    source: "WSJ",
    time: "3시간 전",
    title: "연준, 2024년 금리 인하 가능성 시사... 시장 기대감 상승",
    tags: ["#연준", "#금리"],
    summary: "제롬 파월 연준 의장이 인플레이션이 목표치에 근접하고 있다며 내년 금리 인하 가능성을 시사했다. 이에 따라 미국 증시는 일제히 상승 마감했으며, 특히 기술주 중심의 나스닥이 강세를 보였다.",
    likes: 43,
    comments: 47,
    upvotes: 206,
    downvotes: 35,
    views: 1247,
    imageUrl: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&h=338&fit=crop",
    companyDomain: "federalreserve.gov",
  },
  {
    id: 2,
    category: "속보",
    categoryIcon: "breaking",
    source: "Bloomberg",
    time: "5시간 전",
    title: "테슬라, 중국 상하이 공장 증설 발표... 연간 생산량 100만대 목표",
    tags: ["#테슬라", "#중국"],
    summary: "테슬라가 상하이 기가팩토리의 생산 능력을 대폭 확대한다고 발표했다. 이번 증설로 연간 생산량이 기존 75만대에서 100만대로 증가할 전망이다.",
    likes: 128,
    comments: 89,
    upvotes: 445,
    downvotes: 23,
    views: 3892,
    imageUrl: "https://images.unsplash.com/photo-1617788138017-80ad40651399?w=600&h=338&fit=crop",
    companyDomain: "tesla.com",
  },
  {
    id: 3,
    category: "분석",
    categoryIcon: "analysis",
    source: "Reuters",
    time: "8시간 전",
    title: "엔비디아 실적 분석: AI 칩 수요 폭발로 예상치 상회",
    tags: ["#엔비디아", "#AI", "#실적"],
    summary: "엔비디아가 3분기 실적을 발표했다. 매출은 전년 동기 대비 206% 증가한 181억 달러를 기록했으며, 이는 시장 예상치를 크게 상회하는 수치다. 데이터센터 부문이 성장을 견인했다.",
    likes: 256,
    comments: 134,
    upvotes: 892,
    downvotes: 45,
    views: 8234,
    imageUrl: "https://images.unsplash.com/photo-1639322537228-f710d846310a?w=600&h=338&fit=crop",
    companyDomain: "nvidia.com",
  },
  {
    id: 4,
    category: "암호화폐",
    categoryIcon: "crypto",
    source: "CoinDesk",
    time: "12시간 전",
    title: "비트코인 ETF 승인 임박... SEC 최종 결정 D-7",
    tags: ["#비트코인", "#ETF", "#SEC"],
    summary: "미국 증권거래위원회(SEC)가 비트코인 현물 ETF 승인을 앞두고 있다. 블랙록, 피델리티 등 대형 자산운용사들의 신청이 잇따르면서 시장의 기대감이 고조되고 있다.",
    likes: 312,
    comments: 198,
    upvotes: 1024,
    downvotes: 67,
    views: 12453,
    imageUrl: "https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=600&h=338&fit=crop",
    companyDomain: "bitcoin.org",
  },
  {
    id: 5,
    category: "경제지표",
    categoryIcon: "economic",
    source: "CNBC",
    time: "1일 전",
    title: "미국 고용지표 예상 상회... 실업률 3.7% 유지",
    tags: ["#고용", "#미국경제"],
    summary: "미국 노동부가 발표한 12월 고용보고서에 따르면 비농업 부문 신규 고용은 21만 6천명을 기록해 시장 예상치 17만명을 상회했다. 실업률은 3.7%로 전월과 동일하게 유지됐다.",
    likes: 89,
    comments: 56,
    upvotes: 334,
    downvotes: 28,
    views: 4521,
    imageUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=338&fit=crop",
    companyDomain: "dol.gov",
  },
  {
    id: 6,
    category: "속보",
    categoryIcon: "breaking",
    source: "Reuters",
    time: "2일 전",
    title: "애플, 비전 프로 출시 임박... AR/VR 시장 판도 변화 예고",
    tags: ["#애플", "#비전프로", "#AR"],
    summary: "애플이 첫 번째 혼합현실 헤드셋 '비전 프로'의 출시를 앞두고 있다. 3,499달러의 고가 정책에도 불구하고 업계에서는 AR/VR 시장의 새로운 전환점이 될 것으로 전망하고 있다.",
    likes: 234,
    comments: 156,
    upvotes: 678,
    downvotes: 34,
    views: 9823,
    imageUrl: "https://images.unsplash.com/photo-1622979135225-d2ba269cf1ac?w=600&h=338&fit=crop",
    companyDomain: "apple.com",
  },
  {
    id: 7,
    category: "분석",
    categoryIcon: "analysis",
    source: "Bloomberg",
    time: "2일 전",
    title: "2024년 글로벌 경제 전망: 연착륙 가능성과 리스크 요인",
    tags: ["#글로벌경제", "#2024전망"],
    summary: "주요 투자은행들이 2024년 경제 전망을 발표했다. 대부분 연착륙 시나리오를 예상하지만, 지정학적 리스크와 인플레이션 재발 가능성을 주요 변수로 꼽고 있다.",
    likes: 178,
    comments: 89,
    upvotes: 445,
    downvotes: 23,
    views: 6721,
    imageUrl: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=600&h=338&fit=crop",
    companyDomain: "imf.org",
  },
  {
    id: 8,
    category: "암호화폐",
    categoryIcon: "crypto",
    source: "CoinDesk",
    time: "3일 전",
    title: "이더리움 덴쿤 업그레이드, 레이어2 수수료 90% 절감 기대",
    tags: ["#이더리움", "#덴쿤", "#레이어2"],
    summary: "이더리움 네트워크의 대규모 업그레이드인 '덴쿤'이 예정대로 진행될 전망이다. 이번 업그레이드로 레이어2 솔루션의 거래 수수료가 최대 90%까지 절감될 것으로 예상된다.",
    likes: 445,
    comments: 234,
    upvotes: 1234,
    downvotes: 56,
    views: 15678,
    imageUrl: "https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=600&h=338&fit=crop",
    companyDomain: "ethereum.org",
  },
];

const categories = [
  { id: "all", label: "전체" },
  { id: "general", label: "종합" },
  { id: "breaking", label: "속보" },
  { id: "info", label: "정보" },
  { id: "analysis", label: "분석" },
  { id: "crypto", label: "암호화폐" },
  { id: "economic", label: "경제지표" },
  { id: "energy", label: "에너지" },
  { id: "fed", label: "연준" },
  { id: "calendar", label: "일정" },
];

const menuItems = [
  { id: "news", icon: "news", label: "뉴스", emoji: "📰" },
  { id: "market", icon: "chart", label: "시세", emoji: "📊" },
  { id: "community", icon: "chat", label: "커뮤니티", emoji: "💬" },
  { id: "watchlist", icon: "checklist", label: "관심종목", emoji: "⭐" },
  { id: "profile", icon: "profile", label: "프로필", emoji: "👤" },
  { id: "notification", icon: "notification", label: "알림", emoji: "🔔" },
];

function getCategoryColor(category: string) {
  const colors: Record<string, string> = {
    "정보": "bg-blue-100 text-blue-600",
    "속보": "bg-red-100 text-red-600",
    "분석": "bg-purple-100 text-purple-600",
    "암호화폐": "bg-orange-100 text-orange-600",
    "경제지표": "bg-green-100 text-green-600",
  };
  return colors[category] || "bg-gray-100 text-gray-600";
}

function getCategoryIcon(iconType: string) {
  const icons: Record<string, JSX.Element> = {
    info: (
      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
    ),
    breaking: (
      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
      </svg>
    ),
    analysis: (
      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
        <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
      </svg>
    ),
    crypto: (
      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
        <path d="M10 2a8 8 0 100 16 8 8 0 000-16zM8.5 7.5a.5.5 0 00-1 0v1a.5.5 0 001 0v-1zm3 0a.5.5 0 00-1 0v1a.5.5 0 001 0v-1zM7 10.5a.5.5 0 01.5-.5h5a.5.5 0 010 1h-5a.5.5 0 01-.5-.5zm.5 2a.5.5 0 000 1h5a.5.5 0 000-1h-5z" />
      </svg>
    ),
    economic: (
      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-2 2a1 1 0 101.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    ),
  };
  return icons[iconType] || icons.info;
}

function getMenuIcon(icon: string, active: boolean) {
  const color = active ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600";
  const icons: Record<string, JSX.Element> = {
    news: (
      <svg className={`w-6 h-6 ${color} transition-colors`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
      </svg>
    ),
    chart: (
      <svg className={`w-6 h-6 ${color} transition-colors`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
      </svg>
    ),
    chat: (
      <svg className={`w-6 h-6 ${color} transition-colors`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a2 2 0 01-2-2v-1M13 4H7a2 2 0 00-2 2v6a2 2 0 002 2h2v4l4-4h2a2 2 0 002-2V6a2 2 0 00-2-2z" />
      </svg>
    ),
    checklist: (
      <svg className={`w-6 h-6 ${color} transition-colors`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
    profile: (
      <svg className={`w-6 h-6 ${color} transition-colors`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    notification: (
      <svg className={`w-6 h-6 ${color} transition-colors`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
  };
  return icons[icon];
}

function Sidebar({ activeMenu, onMenuChange }: { activeMenu: string; onMenuChange: (id: string) => void }) {
  return (
    <aside className="fixed left-0 top-0 h-screen bg-white border-r border-gray-100 hidden md:flex flex-col py-4 z-50 transition-all duration-300 w-[72px] lg:w-60">
      {/* Logo */}
      <div className="px-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-lg">A</span>
          </div>
          <span className="text-xl font-bold text-gray-900 hidden lg:block">AlphaBoard</span>
        </div>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 flex flex-col gap-1 px-3">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onMenuChange(item.id)}
            className={`group relative w-full h-12 rounded-xl flex items-center transition-all duration-200 ${
              activeMenu === item.id
                ? "bg-blue-50 text-blue-600"
                : "hover:bg-gray-50 text-gray-600"
            }`}
            title={item.label}
          >
            <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
              {getMenuIcon(item.icon, activeMenu === item.id)}
            </div>
            <span className={`text-sm font-medium hidden lg:block ${
              activeMenu === item.id ? "text-blue-600" : "text-gray-700"
            }`}>
              {item.label}
            </span>
            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap lg:hidden z-50">
              {item.label}
            </div>
          </button>
        ))}
      </nav>

      {/* Login Button */}
      <div className="px-3 mt-auto">
        <Link
          href="/login"
          className="group relative w-full h-12 rounded-xl flex items-center hover:bg-gray-50 transition-colors"
          title="로그인"
        >
          <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-gray-400 group-hover:text-gray-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
          </div>
          <span className="text-sm font-medium text-gray-700 hidden lg:block">로그인</span>
          <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap lg:hidden z-50">
            로그인
          </div>
        </Link>
      </div>
    </aside>
  );
}

function BottomNav({ activeMenu, onMenuChange }: { activeMenu: string; onMenuChange: (id: string) => void }) {
  const bottomMenuItems = menuItems.slice(0, 5);

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-100 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] md:hidden z-50">
      <div className="flex items-center justify-around h-full px-2">
        {bottomMenuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onMenuChange(item.id)}
            className="flex flex-col items-center justify-center flex-1 h-full transition-colors"
          >
            <div className={`transition-colors ${activeMenu === item.id ? "text-blue-600" : "text-gray-400"}`}>
              {getMenuIcon(item.icon, activeMenu === item.id)}
            </div>
            {activeMenu === item.id && (
              <span className="text-[10px] font-medium text-blue-600 mt-1 animate-fade-in">
                {item.label}
              </span>
            )}
          </button>
        ))}
      </div>
    </nav>
  );
}

function SearchBar() {
  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <input
        type="text"
        placeholder="뉴스, 기업명, 티커를 검색해 주세요"
        className="w-full h-12 pl-12 pr-4 bg-white border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
      />
    </div>
  );
}

function CategoryTabs({ activeCategory, onCategoryChange }: { activeCategory: string; onCategoryChange: (id: string) => void }) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-2 scrollbar-hide">
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onCategoryChange(category.id)}
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
            activeCategory === category.id
              ? "bg-gray-900 text-white"
              : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
          }`}
        >
          {category.label}
        </button>
      ))}
    </div>
  );
}

function NewsCard({ news }: { news: typeof newsData[0] }) {
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  return (
    <article className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col h-full group">
      {/* Thumbnail Image */}
      <div className="relative aspect-video overflow-hidden bg-gray-100">
        <Image
          src={news.imageUrl}
          alt={news.title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, (max-width: 1440px) 33vw, 25vw"
          className="object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {/* Category Badge on Image */}
        <div className="absolute top-3 left-3">
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium backdrop-blur-sm ${getCategoryColor(news.category)}`}>
            {getCategoryIcon(news.categoryIcon)}
            {news.category}
          </span>
        </div>
        {/* Company Logo */}
        {news.companyDomain && <CompanyLogo domain={news.companyDomain} />}
      </div>

      {/* Content */}
      <div className="flex-1 p-4 flex flex-col">
        {/* Meta */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-gray-400">{news.time} · {news.source}</span>
        </div>

        {/* Title */}
        <h2 className="text-base font-bold text-gray-900 mb-2 leading-snug line-clamp-2 hover:text-blue-600 cursor-pointer transition-colors">
          {news.title}
        </h2>

        {/* Tags */}
        <div className="flex items-center gap-2 mb-2">
          {news.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="text-xs text-blue-500 hover:text-blue-600 cursor-pointer">
              {tag}
            </span>
          ))}
        </div>

        {/* Summary */}
        <p className="text-sm text-gray-600 leading-relaxed line-clamp-3 flex-1">
          {news.summary}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50">
          <div className="flex items-center gap-3">
            {/* Like */}
            <button
              onClick={() => setLiked(!liked)}
              className={`flex items-center gap-1 text-xs ${liked ? "text-red-500" : "text-gray-400"} hover:text-red-500 transition-colors`}
            >
              <svg className="w-4 h-4" fill={liked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span>{liked ? news.likes + 1 : news.likes}</span>
            </button>

            {/* Comments */}
            <button className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span>{news.comments}</span>
            </button>

            {/* Views */}
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span>{news.views.toLocaleString()}</span>
            </span>
          </div>

          {/* Bookmark */}
          <button
            onClick={() => setBookmarked(!bookmarked)}
            className={`${bookmarked ? "text-blue-500" : "text-gray-400"} hover:text-blue-500 transition-colors`}
          >
            <svg className="w-4 h-4" fill={bookmarked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </button>
        </div>
      </div>
    </article>
  );
}

export default function Home() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeMenu, setActiveMenu] = useState("news");

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      {/* Sidebar - hidden on mobile */}
      <Sidebar activeMenu={activeMenu} onMenuChange={setActiveMenu} />

      {/* Bottom Navigation - visible only on mobile */}
      <BottomNav activeMenu={activeMenu} onMenuChange={setActiveMenu} />

      {/* Main Content */}
      <main className="md:pl-[72px] lg:pl-60 transition-all duration-300">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-6">
          {/* Search Bar */}
          <div className="mb-6 max-w-2xl">
            <SearchBar />
          </div>

          {/* Category Tabs */}
          <div className="mb-6">
            <CategoryTabs activeCategory={activeCategory} onCategoryChange={setActiveCategory} />
          </div>

          {/* News Feed Grid */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-3 lg:gap-5 2xl:grid-cols-4 2xl:gap-6">
            {newsData.map((news) => (
              <NewsCard key={news.id} news={news} />
            ))}
          </div>

          {/* Load More */}
          <div className="mt-8 text-center">
            <button className="px-6 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              더 보기
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

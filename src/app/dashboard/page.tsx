import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "../login/actions";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Mock data for demonstration
  const portfolioValue = 12847350;
  const dailyChange = 2.34;
  const dailyChangeAmount = 293420;

  const watchlist = [
    { symbol: "AAPL", name: "Apple Inc.", price: 178.72, change: 1.23 },
    { symbol: "GOOGL", name: "Alphabet Inc.", price: 141.80, change: -0.45 },
    { symbol: "MSFT", name: "Microsoft Corp.", price: 378.91, change: 0.89 },
    { symbol: "NVDA", name: "NVIDIA Corp.", price: 495.22, change: 3.21 },
    { symbol: "TSLA", name: "Tesla Inc.", price: 248.50, change: -1.12 },
  ];

  const recentNews = [
    { title: "연준, 금리 동결 결정... 시장 안도", time: "2시간 전", source: "Reuters" },
    { title: "테슬라, 신형 모델 발표 예정", time: "4시간 전", source: "Bloomberg" },
    { title: "엔비디아, AI 칩 수요 급증으로 실적 호조", time: "6시간 전", source: "CNBC" },
  ];

  const marketIndices = [
    { name: "S&P 500", value: "4,783.45", change: 0.67 },
    { name: "NASDAQ", value: "15,003.22", change: 1.12 },
    { name: "DOW", value: "37,545.33", change: 0.23 },
    { name: "KOSPI", value: "2,655.28", change: -0.34 },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-8">
              <Link href="/" className="text-2xl font-bold text-blue-600">
                AlphaBoard
              </Link>
              <nav className="hidden md:flex items-center gap-6">
                <Link href="/dashboard" className="text-sm font-medium text-blue-600">
                  대시보드
                </Link>
                <Link href="/dashboard" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                  포트폴리오
                </Link>
                <Link href="/dashboard" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                  시장
                </Link>
                <Link href="/dashboard" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                  뉴스
                </Link>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">{user.email}</span>
              <form action={signOut}>
                <button
                  type="submit"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  로그아웃
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            안녕하세요, {user.user_metadata?.full_name || user.email?.split("@")[0]}님
          </h1>
          <p className="text-gray-600 mt-1">오늘의 투자 현황을 확인하세요.</p>
        </div>

        {/* Portfolio Summary */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-sm font-medium text-gray-500 mb-2">총 자산</h2>
          <div className="flex items-baseline gap-4">
            <span className="text-3xl font-bold text-gray-900">
              ₩{portfolioValue.toLocaleString()}
            </span>
            <span className={`text-sm font-medium ${dailyChange >= 0 ? "text-green-600" : "text-red-600"}`}>
              {dailyChange >= 0 ? "+" : ""}{dailyChange}% (₩{dailyChangeAmount.toLocaleString()})
            </span>
          </div>
        </div>

        {/* Market Indices */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {marketIndices.map((index) => (
            <div key={index.name} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h3 className="text-sm text-gray-500">{index.name}</h3>
              <p className="text-lg font-semibold text-gray-900 mt-1">{index.value}</p>
              <p className={`text-sm ${index.change >= 0 ? "text-green-600" : "text-red-600"}`}>
                {index.change >= 0 ? "+" : ""}{index.change}%
              </p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Watchlist */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">관심 종목</h2>
              <button className="text-sm text-blue-600 hover:text-blue-700">전체보기</button>
            </div>
            <div className="space-y-3">
              {watchlist.map((stock) => (
                <div key={stock.symbol} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="font-medium text-gray-900">{stock.symbol}</p>
                    <p className="text-sm text-gray-500">{stock.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">${stock.price}</p>
                    <p className={`text-sm ${stock.change >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {stock.change >= 0 ? "+" : ""}{stock.change}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent News */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">최신 뉴스</h2>
              <button className="text-sm text-blue-600 hover:text-blue-700">전체보기</button>
            </div>
            <div className="space-y-4">
              {recentNews.map((news, index) => (
                <div key={index} className="py-2 border-b border-gray-50 last:border-0">
                  <p className="font-medium text-gray-900 hover:text-blue-600 cursor-pointer">
                    {news.title}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {news.source} · {news.time}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="flex items-center justify-center gap-2 bg-blue-600 text-white p-4 rounded-xl hover:bg-blue-700 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span className="font-medium">종목 추가</span>
          </button>
          <button className="flex items-center justify-center gap-2 bg-white text-gray-700 p-4 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="font-medium">리포트 보기</span>
          </button>
          <button className="flex items-center justify-center gap-2 bg-white text-gray-700 p-4 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="font-medium">알림 설정</span>
          </button>
          <button className="flex items-center justify-center gap-2 bg-white text-gray-700 p-4 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="font-medium">설정</span>
          </button>
        </div>
      </main>
    </div>
  );
}

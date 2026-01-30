import { Category, MenuItem } from '@/types';

export const categories: Category[] = [
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

export const menuItems: MenuItem[] = [
  { id: "news", icon: "news", label: "뉴스", emoji: "📰", href: "/" },
  { id: "market", icon: "chart", label: "시세", emoji: "📊", href: "/market" },
  { id: "calendar", icon: "calendar", label: "캘린더", emoji: "📅", href: "/calendar" },
  { id: "community", icon: "chat", label: "커뮤니티", emoji: "💬", href: "/community" },
  { id: "feedback", icon: "lightbulb", label: "피드백", emoji: "💡", href: "/feedback" },
  { id: "watchlist", icon: "checklist", label: "관심종목", emoji: "⭐", href: "/watchlist" },
  { id: "profile", icon: "profile", label: "프로필", emoji: "👤", href: "/profile" },
  // 가격 알림 메뉴 - 로그인 시에만 표시 (Sidebar에서 필터링)
  { id: "alerts", icon: "notification", label: "가격 알림", emoji: "🔔", href: "/alerts" },
  { id: "glossary", icon: "book", label: "용어사전", emoji: "📖", href: "/glossary" },
];

// 공지사항/FAQ 메뉴 (사이드바 하단 2열로 별도 표시)
export const infoMenuItems: MenuItem[] = [
  { id: "announcements", icon: "megaphone", label: "공지", emoji: "📢", href: "/announcements" },
  { id: "faq", icon: "question", label: "FAQ", emoji: "❓", href: "/faq" },
];

export const CATEGORY_COLORS: Record<string, string> = {
  "정보": "bg-blue-100 text-blue-600",
  "속보": "bg-red-100 text-red-600",
  "분석": "bg-purple-100 text-purple-600",
  "암호화폐": "bg-orange-100 text-orange-600",
  "경제지표": "bg-green-100 text-green-600",
};

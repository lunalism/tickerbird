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
  { id: "community", icon: "chat", label: "커뮤니티", emoji: "💬", href: "/community" },
  { id: "watchlist", icon: "checklist", label: "관심종목", emoji: "⭐", href: "/watchlist" },
  { id: "profile", icon: "profile", label: "프로필", emoji: "👤", href: "/profile" },
  { id: "notification", icon: "notification", label: "알림", emoji: "🔔", href: "/notifications" },
];

export const CATEGORY_COLORS: Record<string, string> = {
  "정보": "bg-blue-100 text-blue-600",
  "속보": "bg-red-100 text-red-600",
  "분석": "bg-purple-100 text-purple-600",
  "암호화폐": "bg-orange-100 text-orange-600",
  "경제지표": "bg-green-100 text-green-600",
};

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  joinDate: string;
}

export interface ActivitySummary {
  posts: number;
  comments: number;
  watchlist: number;
}

export interface NotificationSettings {
  watchlist: boolean;
  comments: boolean;
  news: boolean;
}

export type ThemeMode = 'light' | 'dark';
export type Language = 'ko' | 'en';

export interface UserSettings {
  notifications: NotificationSettings;
  theme: ThemeMode;
  language: Language;
}

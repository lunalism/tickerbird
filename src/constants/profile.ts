import { UserProfile, ActivitySummary, UserSettings } from '@/types';

export const dummyUserProfile: UserProfile = {
  id: '1',
  name: '투자의신',
  email: 'investor@example.com',
  joinDate: '2024년 1월 15일',
};

export const dummyActivitySummary: ActivitySummary = {
  posts: 24,
  comments: 156,
  watchlist: 12,
};

export const defaultUserSettings: UserSettings = {
  notifications: {
    watchlist: true,
    comments: true,
    news: false,
  },
  theme: 'light',
  language: 'ko',
};

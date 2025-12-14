export type CommunityCategory = 'all' | 'stock' | 'strategy' | 'analysis' | 'free' | 'qna';

export interface CommunityTab {
  id: CommunityCategory;
  label: string;
}

export interface PostStock {
  name: string;
  ticker: string;
}

export interface Post {
  id: number;
  category: CommunityCategory;
  categoryLabel: string;
  title: string;
  author: string;
  authorAvatar?: string;
  createdAt: string;
  views: number;
  likes: number;
  comments: number;
  isHot: boolean;
  stock?: PostStock;
}

export interface HotPost {
  id: number;
  title: string;
  comments: number;
}

export interface DiscussionStock {
  name: string;
  ticker: string;
  mentions: number;
}

export interface ActiveUser {
  name: string;
  avatar: string;
  posts: number;
}

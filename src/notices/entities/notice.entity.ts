export enum NoticeCategory {
  GENERAL = 'general',
  URGENT = 'urgent',
  SYSTEM = 'system',
  TRAVEL = 'travel',
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  category: NoticeCategory;
  isPublished: boolean;
  isPinned: boolean;
  authorId: string;
  authorName?: string;
  viewCount: number;
  created: string;
  updated: string;
}

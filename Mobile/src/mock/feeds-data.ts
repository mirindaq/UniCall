import type { MockAvatar } from './chat-conversations';

export interface FeedPost {
  id: string;
  authorName: string;
  authorAvatar: MockAvatar;
  timeLabel: string;
  content?: string;
  reactionCount: number;
  commentCount: number;
  galleryLabels?: string[];
}

export const feedPosts: FeedPost[] = [
  {
    id: 'p1',
    authorName: 'Minh Quân',
    authorAvatar: { type: 'initials', value: 'MQ', backgroundColor: '#9ca3af' },
    timeLabel: '2 tuần',
    content: 'Cậu út 🙆',
    reactionCount: 16,
    commentCount: 2,
    galleryLabels: ['Ảnh 1', 'Ảnh 2', 'Ảnh 3'],
  },
  {
    id: 'p2',
    authorName: 'Lê Văn Mĩ',
    authorAvatar: { type: 'initials', value: 'LM', backgroundColor: '#86efac' },
    timeLabel: '2 tuần',
    content:
      'Ngày xưa, mọi việc trong nhà dù lớn dù nhỏ đều do bố mẹ quyết định, chợt một ngày, bố mẹ bắt đầu hỏi han ý kiến của tôi...',
    reactionCount: 29,
    commentCount: 5,
    galleryLabels: ['Ảnh bài viết'],
  },
];
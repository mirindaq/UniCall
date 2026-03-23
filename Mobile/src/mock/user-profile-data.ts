import type { MockAvatar } from './chat-conversations';

export interface ProfileShortcut {
  id: string;
  label: string;
  countText?: string;
  icon: 'image-outline' | 'videocam-outline' | 'time-outline' | 'archive-outline';
}

export interface ProfilePost {
  id: string;
  dateLabel: string;
  caption: string;
  reactionText: string;
  commentText: string;
  imageLabels: string[];
}

export interface UserProfileData {
  id: string;
  name: string;
  avatar: MockAvatar;
  coverTitle: string;
  coverTone: string;
  statusBubble?: string;
  isSelf: boolean;
  shortcuts: ProfileShortcut[];
  posts: ProfilePost[];
}

const userProfiles: UserProfileData[] = [
  {
    id: 'me',
    name: 'Lê Việt Hoàng',
    avatar: { type: 'initials', value: 'H', backgroundColor: '#111827' },
    coverTitle: 'Ảnh bìa của tôi',
    coverTone: '#2b3d63',
    statusBubble: 'Trạng thái hiện tại',
    isSelf: true,
    shortcuts: [
      { id: 'my-photos', label: 'Ảnh của tôi', icon: 'image-outline' },
      { id: 'story-box', label: 'Kho khoảnh khắc', countText: '1', icon: 'archive-outline' },
      { id: 'memories', label: 'Kỷ niệm năm xưa', icon: 'time-outline' },
      { id: 'my-videos', label: 'Video của tôi', icon: 'videocam-outline' },
    ],
    posts: [],
  },
  {
    id: 'hung',
    name: 'Nguyễn Đức Hùng',
    avatar: { type: 'initials', value: 'H', backgroundColor: '#3f5f4f' },
    coverTitle: 'Không có hoạt động',
    coverTone: '#111827',
    isSelf: false,
    shortcuts: [],
    posts: [],
  },
  {
    id: 'minh-quan',
    name: 'Minh Quân',
    avatar: { type: 'initials', value: 'MQ', backgroundColor: '#9ca3af' },
    coverTitle: 'Trang cá nhân',
    coverTone: '#4d6b3d',
    isSelf: false,
    shortcuts: [
      { id: 'photos', label: 'Ảnh', countText: '374', icon: 'image-outline' },
      { id: 'videos', label: 'Video', countText: '2', icon: 'videocam-outline' },
    ],
    posts: [
      {
        id: 'post-1',
        dateLabel: '4 tháng 3',
        caption: 'Cậu út 🙆',
        reactionText: '16 bạn',
        commentText: '2 bình luận',
        imageLabels: ['Ảnh 1', 'Ảnh 2', 'Ảnh 3'],
      },
      {
        id: 'post-2',
        dateLabel: '29 tháng 10, 2025',
        caption: '🌿 Dự án Bảo Tân Residence - Quận Bình Tân\nVị trí: Đường Nguyễn Triệu Luật, phường Tân Tạo... ',
        reactionText: '2 bạn',
        commentText: '1 bình luận',
        imageLabels: ['Lô 1', 'Lô 2', '+9'],
      },
    ],
  },
];

const conversationToUserId: Record<string, string> = {
  hung: 'hung',
  hoang: 'minh-quan',
  danh: 'minh-quan',
};

export function getUserProfileById(userId: string): UserProfileData {
  return userProfiles.find((item) => item.id === userId) ?? userProfiles[0];
}

export function getUserProfileByConversationId(conversationId: string): UserProfileData {
  const userId = conversationToUserId[conversationId] ?? 'hung';
  return getUserProfileById(userId);
}

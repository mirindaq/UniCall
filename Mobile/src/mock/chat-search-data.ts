import type { MockAvatar } from './chat-conversations';

export interface SearchContactItem {
  id: string;
  name: string;
  subtitle?: string;
  avatar: MockAvatar;
  canCall?: boolean;
}

export interface SearchMessageItem {
  id: string;
  name: string;
  excerpt: string;
  timeLabel: string;
  matchCount: string;
  avatar: MockAvatar;
}

export const searchKeyword = 'giáp';

export const searchContacts: SearchContactItem[] = [
  {
    id: 'contact-1',
    name: 'Giáp Việt Hoàng',
    avatar: { type: 'initials', value: 'VH', backgroundColor: '#8db3d9' },
    canCall: true,
  },
  {
    id: 'contact-2',
    name: 'FIT_SE_KTPM_Khóa 18',
    subtitle: 'Thành viên: Giáp Việt Hoàng',
    avatar: { type: 'initials', value: '99+', backgroundColor: '#cbd5e1', textColor: '#475569' },
  },
  {
    id: 'contact-3',
    name: 'TPP_TOEIC R&L: HỖ TRỢ HỌC VIÊN',
    subtitle: 'Thành viên: Giáp Việt Hoàng',
    avatar: { type: 'initials', value: 'TP', backgroundColor: '#1e3a8a' },
  },
  {
    id: 'contact-4',
    name: 'Nhóm CNM',
    subtitle: 'Thành viên: Giáp Việt Hoàng',
    avatar: { type: 'initials', value: 'N', backgroundColor: '#d8b4fe', textColor: '#7e22ce' },
  },
];

export const searchMessages: SearchMessageItem[] = [
  {
    id: 'message-1',
    name: 'Nguyễn Đức Hùng',
    excerpt: 'sáng Giáp chỉ m chạy rồi đk',
    timeLabel: 'T7',
    matchCount: '35 kết quả phù hợp',
    avatar: { type: 'initials', value: 'H', backgroundColor: '#3f5f4f' },
  },
  {
    id: 'message-2',
    name: 'Tứ Đại Nghiện Sĩ',
    excerpt: '@Giáp Việt Hoàng Z dễ bạn mang nón',
    timeLabel: 'T7',
    matchCount: '99+ kết quả phù hợp',
    avatar: { type: 'emoji', value: '👥', backgroundColor: '#22c1ee' },
  },
  {
    id: 'message-3',
    name: 'Phan Khánh Chương',
    excerpt: 'ngại hỏi giáp quá',
    timeLabel: 'T3',
    matchCount: '51 kết quả phù hợp',
    avatar: { type: 'initials', value: 'PC', backgroundColor: '#6aa35f' },
  },
];


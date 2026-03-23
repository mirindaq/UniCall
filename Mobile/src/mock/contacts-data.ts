import type { MockAvatar } from './chat-conversations';

export type ContactsSubTab = 'friends' | 'groups' | 'oa';

export interface FriendActionItem {
  id: string;
  type: 'invite' | 'birthday';
  title: string;
  countText?: string;
}

export interface FriendContactItem {
  id: string;
  name: string;
  avatar: MockAvatar;
  section?: string;
}

export interface GroupContactItem {
  id: string;
  name: string;
  subtitle: string;
  timeLabel: string;
  birthdayText?: string;
}

export interface OaContactItem {
  id: string;
  name: string;
  avatar: MockAvatar;
  verified?: boolean;
}

export const friendActions: FriendActionItem[] = [
  { id: 'invite', type: 'invite', title: 'Lời mời kết bạn', countText: '4' },
  { id: 'birthday', type: 'birthday', title: 'Sinh nhật' },
];

export const friendContacts: FriendContactItem[] = [
  {
    id: 'close-1',
    name: 'Gấu 🐻🐼 :3',
    section: 'Bạn thân',
    avatar: { type: 'initials', value: 'G', backgroundColor: '#7fa6c8' },
  },
  { id: 'sharp', name: '...', section: '#', avatar: { type: 'initials', value: 'S', backgroundColor: '#111827' } },
  { id: 'cvcn', name: 'Cá Viên Chiên Nèee', section: 'C', avatar: { type: 'emoji', value: '🍲', backgroundColor: '#f2f2f2' } },
  { id: 'dqt', name: 'Đặng Quốc Thắng', section: 'D', avatar: { type: 'initials', value: 'D', backgroundColor: '#9ca3af' } },
];

export const groupItems: GroupContactItem[] = [
  {
    id: 'gr-1',
    name: 'Ngọc Rồng Đại Việt',
    subtitle: '@Thanh Nguyễn Share bài r ib ad...',
    timeLabel: '19 giờ',
  },
  {
    id: 'gr-2',
    name: 'FIT_SE_KTPM_Khóa 18',
    subtitle: 'Gửi các bạn thông tin buổi kiến tập...',
    birthdayText: '🎂 Hôm nay là sinh nhật của Lê Ngọc Dung',
    timeLabel: '20 giờ',
  },
  {
    id: 'gr-3',
    name: 'SHCN_DHKTPM18A',
    subtitle: '[Link] Thầy cô chia sẻ cho các lớp...',
    birthdayText: '🎂 Hôm nay là sinh nhật của Phan Khánh C...',
    timeLabel: '21 giờ',
  },
  {
    id: 'gr-4',
    name: 'Tứ Đại Nghiện Sĩ',
    subtitle: 'Nghỉ mà cũng copy',
    birthdayText: '🎂 Hôm nay là sinh nhật của Phan Khánh C...',
    timeLabel: 'T7',
  },
  {
    id: 'gr-5',
    name: 'KTTKPM_DHKTPM18C_HK2_...',
    subtitle: 'Dạ thưa cô em tên là Nguyễn Thị...',
    birthdayText: '🎂 Hôm nay là sinh nhật của Phan Khánh C...',
    timeLabel: 'T7',
  },
];

export const oaItems: OaContactItem[] = [
  { id: 'oa-1', name: 'Chính quyền số tỉnh Gia Lai', avatar: { type: 'initials', value: 'GL', backgroundColor: '#d1d5db' }, verified: true },
  { id: 'oa-2', name: 'Fiza', avatar: { type: 'initials', value: 'F', backgroundColor: '#fce7f3' }, verified: true },
  { id: 'oa-3', name: 'Nâng cấp Zing MP3', avatar: { type: 'emoji', value: '💿', backgroundColor: '#dbeafe' }, verified: true },
  { id: 'oa-4', name: 'Nhà thuốc FPT Long Châu', avatar: { type: 'initials', value: 'LC', backgroundColor: '#c7d2fe' }, verified: true },
  { id: 'oa-5', name: 'Thời Tiết', avatar: { type: 'emoji', value: '⛅', backgroundColor: '#93c5fd' }, verified: true },
  { id: 'oa-6', name: 'Ví QR', avatar: { type: 'initials', value: 'QR', backgroundColor: '#bfdbfe' }, verified: true },
  { id: 'oa-7', name: 'Zalo Hỗ Trợ Android', avatar: { type: 'initials', value: 'Z', backgroundColor: '#e5e7eb' }, verified: true },
];


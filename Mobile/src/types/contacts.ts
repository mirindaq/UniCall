import type { MockAvatar } from '@/mock/chat-conversations';

export type ContactsSubTab = 'friends' | 'groups';

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

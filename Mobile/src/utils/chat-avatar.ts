import type { MockAvatar } from '@/mock/chat-conversations';
import { avatarColorsFromSeed } from '@/constants/chat-ui';

export const toDisplayInitials = (fullName: string) => {
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return 'U';
  }
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return `${words[0][0] ?? ''}${words[words.length - 1][0] ?? ''}`.toUpperCase();
};

/** Avatar initials + màu — dùng thống nhất danh sách chat, chi tiết chat, danh bạ. */
export const buildMockAvatar = (displayName: string, seed?: string): MockAvatar => {
  const value = toDisplayInitials(displayName);
  const colors = avatarColorsFromSeed(seed?.trim() || displayName.trim() || value);
  return {
    type: 'initials',
    value,
    backgroundColor: colors.bg,
    textColor: colors.text,
  };
};

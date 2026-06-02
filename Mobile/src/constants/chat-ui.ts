/** Màu & class dùng chung cho UI chat mobile (theme sáng). */
export const CHAT_PAGE_BG = 'bg-slate-50';
export const CHAT_DETAIL_BG = 'bg-[#eef3f9]';
export const CHAT_BRAND = '#1e98f3';

export const bubbleMineClass =
  'rounded-[18px] rounded-br-[6px] border border-sky-100 bg-[#e8f4ff]';
export const bubbleOtherClass =
  'rounded-[18px] rounded-bl-[6px] border border-slate-100 bg-white';

/** Màu avatar initials — nền pastel + chữ đậm (dễ đọc trên bubble chat). */
const AVATAR_COLOR_PAIRS = [
  { bg: '#dbeafe', text: '#1e40af' },
  { bg: '#e0e7ff', text: '#3730a3' },
  { bg: '#ede9fe', text: '#5b21b6' },
  { bg: '#fce7f3', text: '#9d174d' },
  { bg: '#ffe4e6', text: '#be123c' },
  { bg: '#ffedd5', text: '#c2410c' },
  { bg: '#fef3c7', text: '#b45309' },
  { bg: '#ecfccb', text: '#3f6212' },
  { bg: '#ccfbf1', text: '#0f766e' },
  { bg: '#cffafe', text: '#0e7490' },
] as const;

export const avatarColorsFromSeed = (seed: string) => {
  const normalized = seed.trim().toLowerCase();
  if (!normalized) {
    return AVATAR_COLOR_PAIRS[0];
  }
  let hash = 0;
  for (let index = 0; index < normalized.length; index += 1) {
    hash = normalized.charCodeAt(index) + ((hash << 5) - hash);
  }
  return AVATAR_COLOR_PAIRS[Math.abs(hash) % AVATAR_COLOR_PAIRS.length];
};

export const CHAT_MESSAGE_AVATAR_SIZE = 36;

export interface ChatQuickAction {
  id: string;
  label: string;
  icon: 'search-outline' | 'person-outline' | 'color-wand-outline' | 'notifications-off-outline';
}

export interface ChatOptionItem {
  id: string;
  label: string;
  icon:
    | 'create-outline'
    | 'star-outline'
    | 'time-outline'
    | 'people-outline'
    | 'attach-outline'
    | 'pin-outline'
    | 'eye-off-outline'
    | 'call-outline'
    | 'timer-outline'
    | 'settings-outline'
    | 'warning-outline'
    | 'ban-outline'
    | 'pie-chart-outline'
    | 'trash-outline';
  subtitle?: string;
  hasSwitch?: boolean;
  switchValue?: boolean;
  danger?: boolean;
  chevron?: boolean;
  trailingText?: string;
}

export const chatQuickActions: ChatQuickAction[] = [
  { id: 'search', label: 'Tìm tin nhắn', icon: 'search-outline' },
  { id: 'profile', label: 'Trang cá nhân', icon: 'person-outline' },
  { id: 'theme', label: 'Đổi hình nền', icon: 'color-wand-outline' },
  { id: 'mute', label: 'Tắt thông báo', icon: 'notifications-off-outline' },
];

export const mediaPreviewLabels = ['Video', 'Ảnh 1', 'Ảnh 2', 'Ảnh 3'];

export const chatOptionSections: ChatOptionItem[][] = [
  [
    { id: 'rename', label: 'Đổi tên gợi nhớ', icon: 'create-outline' },
    { id: 'best-friend', label: 'Đánh dấu bạn thân', icon: 'star-outline', hasSwitch: true, switchValue: false },
    { id: 'shared-diary', label: 'Nhật ký chung', icon: 'time-outline' },
    { id: 'create-group', label: 'Tạo nhóm với người này', icon: 'people-outline' },
    { id: 'add-group', label: 'Thêm vào nhóm', icon: 'people-outline' },
    { id: 'common-group', label: 'Xem nhóm chung', icon: 'people-outline', trailingText: '(15)' },
  ],
  [
    { id: 'pin-chat', label: 'Ghim trò chuyện', icon: 'pin-outline', hasSwitch: true, switchValue: false },
    { id: 'hide-chat', label: 'Ẩn trò chuyện', icon: 'eye-off-outline', hasSwitch: true, switchValue: false },
    { id: 'incoming-call', label: 'Báo cuộc gọi đến', icon: 'call-outline', hasSwitch: true, switchValue: true },
    { id: 'auto-delete', label: 'Tin nhắn tự xóa', icon: 'timer-outline', subtitle: 'Không tự xóa' },
    { id: 'personalize', label: 'Cài đặt cá nhân', icon: 'settings-outline' },
  ],
  [
    { id: 'report', label: 'Báo xấu', icon: 'warning-outline' },
    { id: 'block', label: 'Quản lý chặn', icon: 'ban-outline', chevron: true },
    { id: 'storage', label: 'Dung lượng trò chuyện', icon: 'pie-chart-outline' },
    { id: 'clear-history', label: 'Xóa lịch sử trò chuyện', icon: 'trash-outline', danger: true },
  ],
];
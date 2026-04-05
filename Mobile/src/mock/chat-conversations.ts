export type MockAvatar =
  | {
      type: "initials";
      value: string;
      backgroundColor: string;
      textColor?: string;
    }
  | {
      type: "emoji";
      value: string;
      backgroundColor: string;
      textColor?: string;
    };

export interface MockConversation {
  id: string;
  name: string;
  preview: string;
  timeLabel: string;
  avatar: MockAvatar;
  isPinned?: boolean;
  hasUnreadDot?: boolean;
  isPreviewBold?: boolean;
  isVerified?: boolean;
}

export const mockConversations: MockConversation[] = [
  {
    id: "my-documents",
    name: "My Documents",
    preview: "Bạn: [File] Expo-Go-55.0.5.apk",
    timeLabel: "17 giờ",
    isPinned: true,
    isVerified: true,
    avatar: {
      type: "emoji",
      value: "📁",
      backgroundColor: "#4f9cf6",
    },
  },
  {
    id: "hung",
    name: "Nguyễn Đức Hùng",
    preview: "Bạn: [Sticker]",
    timeLabel: "2 giờ",
    avatar: {
      type: "initials",
      value: "H",
      backgroundColor: "#3f5f4f",
    },
  },
  {
    id: "hoang",
    name: "Giáp Việt Hoàng",
    preview: "Bạn: Tày r",
    timeLabel: "3 giờ",
    avatar: {
      type: "initials",
      value: "VH",
      backgroundColor: "#8db3d9",
    },
  },
  {
    id: "danh",
    name: "Đào Đức Danh",
    preview: "Bạn: Khó cúu",
    timeLabel: "4 giờ",
    avatar: {
      type: "initials",
      value: "DD",
      backgroundColor: "#c284f8",
    },
  },
  {
    id: "media-box",
    name: "Media Box",
    preview: "Zalo Video: Xôn xao ô tô bán tải đỗ...",
    timeLabel: "",
    hasUnreadDot: true,
    isPreviewBold: true,
    avatar: {
      type: "emoji",
      value: "🧊",
      backgroundColor: "#ffffff",
    },
  },
  {
    id: "weather",
    name: "Thời Tiết",
    preview: "Chúc một ngày tốt lành, thời tiết TP...",
    timeLabel: "8 giờ",
    hasUnreadDot: true,
    isPreviewBold: true,
    isVerified: true,
    avatar: {
      type: "emoji",
      value: "⛅",
      backgroundColor: "#3ba2f6",
    },
  },
  {
    id: "zalo",
    name: "Zalo",
    preview: "Đăng nhập Zalo trên máy tính thành...",
    timeLabel: "17 giờ",
    isVerified: true,
    avatar: {
      type: "initials",
      value: "Z",
      backgroundColor: "#ffffff",
      textColor: "#0f6edb",
    },
  },
  {
    id: "chuong",
    name: "Phan Khánh Chương",
    preview: "Bạn: Mai mình trao đổi tiếp nhé.",
    timeLabel: "18 giờ",
    avatar: {
      type: "initials",
      value: "PC",
      backgroundColor: "#6aa35f",
    },
  },
  {
    id: "hai",
    name: "Lê Việt Hải",
    preview: "[Sticker]",
    timeLabel: "18 giờ",
    avatar: {
      type: "initials",
      value: "LH",
      backgroundColor: "#3ba2f6",
    },
  },
];

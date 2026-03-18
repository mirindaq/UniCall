export const messageSidebarChats = [
  {
    id: 1,
    name: "Nguyễn Đức Hùng",
    lastMessage: "Nè",
    time: "1 giờ",
    unread: 0,
    avatar:
      "https://avatarngau.sbs/wp-content/uploads/2025/05/avatar-phong-canh-17.jpg",
  },
  {
    id: 2,
    name: "Giáp Việt Hoàng",
    lastMessage: "Làm bài coi???",
    time: "2 giờ",
    unread: 3,
    avatar:
      "https://cdn2.fptshop.com.vn/unsafe/Avatar_Facebook_dep_1_210f53f297.jpg",
  },
  {
    id: 3,
    name: "My Documents",
    lastMessage: "Bạn: 123456789",
    time: "Hôm qua",
    unread: 0,
    avatar:
      "https://i0.wp.com/help.zalo.me/wp-content/uploads/2023/08/z4650065944256_2971e71cc06a5cfcb0aef41782e5f30e.jpg?fit=512%2C512&ssl=1",
  },
]

export const messageWindowMessages = [
  {
    id: 1,
    sender: "me",
    text: "Alo",
    time: "07:05",
    type: "text",
  },
  {
    id: 2,
    sender: "me",
    text: "Gửi t file kia đi",
    time: "07:05",
    type: "text",
  },
  {
    id: 3,
    sender: "them",
    text: "Ok đợi tí",
    time: "07:17",
    type: "text",
    avatar:
      "https://avatarngau.sbs/wp-content/uploads/2025/05/avatar-phong-canh-17.jpg",
  },
  {
    id: 4,
    sender: "them",
    fileName: "NhomKTPM.docx",
    fileSize: "276 KB",
    time: "07:19",
    type: "file",
    avatar:
      "https://avatarngau.sbs/wp-content/uploads/2025/05/avatar-phong-canh-17.jpg",
  },
  {
    id: 5,
    sender: "them",
    text: "Nè",
    time: "07:19",
    type: "text",
    avatar:
      "https://avatarngau.sbs/wp-content/uploads/2025/05/avatar-phong-canh-17.jpg",
  },
] as const

export const messageInfoPreviewFiles = [
  {
    name: "NhomKTPM.docx",
    size: "276 KB",
    time: "Hôm qua",
    icon: "DOCX",
    color: "bg-blue-500",
  },
  {
    name: "hehe.docx",
    size: "624 KB",
    time: "09/03/2026",
    icon: "DOCX",
    color: "bg-blue-500",
  },
  {
    name: "project.mpp",
    size: "242.5 KB",
    time: "09/03/2026",
    icon: "MPP",
    color: "bg-[#42a5f5]",
  },
]

export const messageInfoPreviewLinks = [
  {
    title: "https://vt.tiktok.com/ZSuPFP46c/",
    sub: "vt.tiktok.com",
    time: "14/03",
    icon: "link",
  },
  {
    title: "https://drive.google.com/drive/folder...",
    sub: "drive.google.com",
    time: "13/03",
    icon: "drive",
  },
]

export const messageStorageImageGroups = [
  {
    title: "Ngày 14 tháng 3",
    images: [
      "https://images.unsplash.com/photo-1542204165-65bf26472b9b?w=150&h=150&fit=crop",
    ],
  },
  {
    title: "Ngày 13 tháng 3",
    images: [],
  },
  {
    title: "Ngày 11 tháng 3",
    images: [
      "https://images.unsplash.com/photo-1453728013993-6d66e9c9123a?w=150&h=150&fit=crop",
      "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=150&h=150&fit=crop",
    ],
  },
  {
    title: "Ngày 30 tháng 1",
    images: [
      "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=150&h=150&fit=crop",
      "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=150&h=150&fit=crop",
      "https://images.unsplash.com/photo-1586282391129-76a6df230234?w=150&h=150&fit=crop",
    ],
  },
]

export const messageStorageFileGroups = [
  {
    title: "Ngày 16 tháng 3",
    files: [
      {
        name: "NhomKTPM.docx",
        size: "276 KB",
        extension: "W",
        extensionColor: "bg-blue-500",
        state: "download",
      },
    ],
  },
  {
    title: "Ngày 09 tháng 3",
    files: [
      {
        name: "hehe.docx",
        size: "624 KB",
        extension: "W",
        extensionColor: "bg-blue-500",
        state: "download",
      },
      {
        name: "project.mpp",
        size: "242.5 KB",
        extension: "MPP",
        extensionColor: "bg-[#42a5f5]",
        state: "download",
      },
    ],
  },
  {
    title: "Ngày 30 tháng 1",
    files: [
      {
        name: "cau23_2425.docx",
        size: "16.33 KB",
        extension: "W",
        extensionColor: "bg-blue-500",
        state: "saved",
      },
      {
        name: "Book1.xlsx",
        size: "12.78 KB",
        extension: "X",
        extensionColor: "bg-green-500",
        state: "missing",
      },
      {
        name: "itpm06-140329000723-phpapp02.pdf",
        size: "4.23 MB",
        extension: "PDF",
        extensionColor: "bg-red-500",
        state: "missing",
      },
    ],
  },
] as const

export const messageStorageLinkGroups = [
  {
    title: "Ngày 14 tháng 3",
    links: [
      {
        title: "https://vt.tiktok.com/ZSuPFP46c/",
        domain: "vt.tiktok.com",
        icon: "default",
        hasActions: false,
      },
    ],
  },
  {
    title: "Ngày 13 tháng 3",
    links: [
      {
        title: "https://drive.google.com/drive/f...",
        domain: "drive.google.com",
        icon: "drive",
        hasActions: true,
      },
      {
        title: "GitHub - 2112pk1z/Unicall/Backend: back...",
        domain: "github.com",
        icon: "default",
        hasActions: false,
      },
    ],
  },
  {
    title: "Ngày 09 tháng 3",
    links: [
      {
        title: "Outlook",
        domain: "outlook.office.com",
        icon: "default",
        hasActions: false,
      },
    ],
  },
] as const

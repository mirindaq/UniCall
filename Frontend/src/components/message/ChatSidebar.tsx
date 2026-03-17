import {
  ChevronDown,
  MoreHorizontal,
  Search,
  UserPlus,
  Users,
} from "lucide-react"

const mockChats = [
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
    lastMessage: "Làm bài coi ???",
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

export default function ChatSidebar() {
  return (
    <div className="flex h-full w-80 shrink-0 flex-col border-r border-gray-200 bg-white">
      {/* Search & Actions */}
      <div className="shrink-0 border-b border-gray-100 p-4 pb-0">
        <div className="mb-4 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute top-2 left-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm"
              className="w-full rounded-md bg-gray-100 py-1.5 pr-4 pl-9 text-sm focus:outline-none"
            />
          </div>
          <button
            className="rounded p-1 text-gray-600 hover:bg-gray-100"
            title="Thêm bạn"
          >
            <UserPlus className="h-5 w-5" />
          </button>
          <button
            className="rounded p-1 text-gray-600 hover:bg-gray-100"
            title="Tạo nhóm"
          >
            <Users className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs & Filters */}
        <div className="flex items-center justify-between">
          <div className="flex gap-4 text-sm font-medium text-gray-500">
            <button className="border-b-2 border-blue-600 pb-2 text-blue-600">
              Tất cả
            </button>
            <button className="pb-2 hover:text-gray-800">Chưa đọc</button>
          </div>

          <div className="flex items-center gap-1 pb-2 text-xs font-medium text-gray-600">
            <button className="flex items-center gap-1 rounded px-1.5 py-1 hover:bg-gray-100">
              Phân loại <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
            </button>
            <button className="rounded p-1 hover:bg-gray-100">
              <MoreHorizontal className="h-4 w-4 text-gray-500" />
            </button>
          </div>
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {mockChats.map((chat) => (
          <div
            key={chat.id}
            className={`flex cursor-pointer items-center gap-3 p-3 hover:bg-gray-50 ${chat.id === 1 ? "bg-blue-50" : ""}`}
          >
            <img
              src={chat.avatar}
              alt={chat.name}
              className="h-11 w-11 rounded-full"
            />
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-baseline justify-between">
                <h3 className="truncate text-sm font-medium text-gray-900">
                  {chat.name}
                </h3>
                <span className="ml-2 text-xs whitespace-nowrap text-gray-500">
                  {chat.time}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <p className="truncate text-xs text-gray-500">
                  {chat.lastMessage}
                </p>
                {chat.unread > 0 && (
                  <span className="min-w-[18px] rounded-full bg-red-500 px-1.5 py-0.5 text-center text-[10px] font-bold text-white">
                    {chat.unread > 5 ? "5+" : chat.unread}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

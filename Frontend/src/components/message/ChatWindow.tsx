import {
  Image as ImageIcon,
  PanelRight,
  Paperclip,
  Phone,
  Search,
  Send,
  Smile,
  Sticker,
  Video,
} from "lucide-react"
import { useRef } from "react"

const mockMessages = [
  // ... (giữ nguyên mockMessages của bạn)
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
]

export default function ChatWindow() {
  // 1. Khai báo ref để can thiệp vào DOM của thẻ textarea
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 2. Hàm xử lý tự động giãn chiều cao
  const handleInput = () => {
    const textarea = textareaRef.current
    if (textarea) {
      // Reset chiều cao về auto để tính toán lại khi xóa bớt chữ
      textarea.style.height = "auto"
      // Đặt chiều cao mới bằng với chiều cao thực tế của nội dung (giới hạn bởi max-h-32 trong class)
      textarea.style.height = `${textarea.scrollHeight}px`
    }
  }

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col bg-slate-50">
      {/* Header */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4">
        <div className="flex items-center gap-3">
          <img
            src="https://avatarngau.sbs/wp-content/uploads/2025/05/avatar-phong-canh-17.jpg"
            alt="Avatar"
            className="h-10 w-10 rounded-full"
          />
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Nguyễn Đức Hùng
            </h2>
            <p className="text-xs text-green-500">Vừa mới truy cập</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-gray-500">
          <button className="hover:text-blue-600" title="Tìm kiếm tin nhắn">
            <Search className="h-5 w-5" />
          </button>
          <button className="hover:text-blue-600" title="Cuộc gọi thoại">
            <Phone className="h-5 w-5" />
          </button>
          <button className="hover:text-blue-600" title="Cuộc gọi video">
            <Video className="h-5 w-5" />
          </button>
          <button className="text-blue-600" title="Thông tin hội thoại">
            <PanelRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {mockMessages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === "me" ? "justify-end" : "justify-start"} gap-2`}
          >
            {msg.sender === "them" && (
              <img
                src={msg.avatar}
                alt="Avatar"
                className="mb-1 h-8 w-8 self-end rounded-full"
              />
            )}
            <div
              className={`flex flex-col ${msg.sender === "me" ? "items-end" : "items-start"} max-w-[70%]`}
            >
              {msg.type === "text" ? (
                <div
                  className={`rounded-2xl px-4 py-2 text-sm ${msg.sender === "me" ? "rounded-br-sm bg-[#e5efff] text-gray-900" : "rounded-bl-sm border border-gray-100 bg-white text-gray-800 shadow-sm"}`}
                >
                  {msg.text}
                </div>
              ) : (
                <div className="flex w-64 items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-blue-500 p-2 text-lg font-bold text-white">
                    W
                  </div>
                  <div className="overflow-hidden">
                    <p className="cursor-pointer truncate text-sm font-medium text-blue-600 hover:underline">
                      {msg.fileName}
                    </p>
                    <p className="text-xs text-gray-500">{msg.fileSize}</p>
                  </div>
                </div>
              )}
              <span className="mt-1 text-[11px] text-gray-400">{msg.time}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Input Area */}
      <div className="shrink-0 border-t border-gray-200 bg-white p-3">
        {/* Thanh công cụ */}
        <div className="mb-2 flex gap-2 text-gray-500">
          <button
            className="rounded p-1.5 hover:bg-gray-100"
            title="Gửi sticker"
          >
            <Sticker className="h-5 w-5" />
          </button>
          <button className="rounded p-1.5 hover:bg-gray-100" title="Gửi ảnh">
            <ImageIcon className="h-5 w-5" />
          </button>
          <button
            className="rounded p-1.5 hover:bg-gray-100"
            title="Đính kèm file"
          >
            <Paperclip className="h-5 w-5" />
          </button>
        </div>

        {/* Khung nhập liệu */}
        <div className="flex items-end gap-2">
          <div className="flex flex-1 items-end rounded-lg border border-gray-300 bg-white py-1 pr-2 focus-within:border-blue-500">
            {/* 3. Gắn ref và sự kiện onInput vào textarea */}
            <textarea
              ref={textareaRef}
              onInput={handleInput}
              placeholder="Nhập @, tin nhắn tới Nguyễn Đức Hùng"
              className="custom-scrollbar max-h-32 min-h-[32px] w-full resize-none bg-transparent p-2 pl-3 text-sm outline-none"
              rows={1}
            />
            <button
              className="mb-1 shrink-0 p-1 text-gray-400 hover:text-gray-600"
              title="Chọn biểu tượng cảm xúc"
            >
              <Smile className="h-5 w-5" />
            </button>
          </div>

          {/* Nút gửi tin nhắn */}
          <button
            className="mb-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700"
            title="Gửi"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

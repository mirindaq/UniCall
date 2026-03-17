import ChatDetails from "@/components/message/ChatDetails"
import ChatSidebar from "@/components/message/ChatSidebar"
import ChatWindow from "@/components/message/ChatWindow"

export function UserChatPage() {
  return (
    // Đơn giản chỉ cần h-full là nó sẽ tự động vừa in với phần còn lại của màn hình
    <div className="flex h-full w-full overflow-hidden bg-white">
      <ChatSidebar />
      <ChatWindow />
      <ChatDetails />
    </div>
  )
}

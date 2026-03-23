import ChatDetails from "@/components/message/ChatDetails"
import ChatSidebar from "@/components/message/ChatSidebar"
import ChatWindow from "@/components/message/ChatWindow"

export function UserChatPage() {
  return (
    <div className="flex h-full w-full overflow-hidden bg-background">
      <ChatSidebar />
      <ChatWindow />
      <ChatDetails />
    </div>
  )
}

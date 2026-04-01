import ChatDetails from "@/components/message/ChatDetails"
import ChatSidebar from "@/components/message/ChatSidebar"
import ChatWindow from "@/components/message/ChatWindow"
import { ChatPageProvider } from "@/contexts/ChatPageContext"

export function UserChatPage() {
  return (
    <ChatPageProvider>
      <div className="flex h-full w-full overflow-hidden bg-background">
        <ChatSidebar />
        <ChatWindow />
        <ChatDetails />
      </div>
    </ChatPageProvider>
  )
}

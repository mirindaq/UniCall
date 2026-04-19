import ChatDetails from "@/components/message/ChatDetails"
import ChatSidebar from "@/components/message/ChatSidebar"
import ChatWindow from "@/components/message/ChatWindow"
import { ChatPageProvider, useChatPage } from "@/contexts/ChatPageContext"

function ChatPageLayout() {
  const { isDetailsPanelOpen } = useChatPage()

  return (
    <div className="flex h-full w-full overflow-hidden bg-background">
      <ChatSidebar />
      <ChatWindow />
      {isDetailsPanelOpen ? <ChatDetails /> : null}
    </div>
  )
}

export function UserChatPage() {
  return (
    <ChatPageProvider>
      <ChatPageLayout />
    </ChatPageProvider>
  )
}

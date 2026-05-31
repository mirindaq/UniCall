import ChatDetails from "@/components/message/ChatDetails"
import ChatSidebar from "@/components/message/ChatSidebar"
import ChatWindow from "@/components/message/ChatWindow"
import { ChatPageProvider, useChatPage } from "@/contexts/ChatPageContext"
import { cn } from "@/lib/utils"

function ChatPageLayout() {
  const { isDetailsPanelOpen, selectedConversationId } = useChatPage()
  const hasSelectedConversation = Boolean(selectedConversationId)

  return (
    <div className="flex h-full w-full overflow-hidden bg-background">
      <div
        className={cn(
          "min-w-0",
          hasSelectedConversation ? "hidden lg:flex" : "flex w-full lg:w-auto"
        )}
      >
        <ChatSidebar />
      </div>

      <div
        className={cn(
          "min-w-0 flex-1",
          hasSelectedConversation ? "flex" : "hidden lg:flex"
        )}
      >
        <ChatWindow />
      </div>

      {isDetailsPanelOpen ? (
        <div className="hidden lg:flex">
          <ChatDetails />
        </div>
      ) : null}
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

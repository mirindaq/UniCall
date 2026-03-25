import { useState } from "react"

import ChatDetails from "@/components/message/ChatDetails"
import ChatSidebar, {
  type ConversationSelection,
} from "@/components/message/ChatSidebar"
import ChatWindow from "@/components/message/ChatWindow"

export function UserChatPage() {
  const [activeConversation, setActiveConversation] =
    useState<ConversationSelection | null>(null)

  return (
    <div className="flex h-full w-full overflow-hidden bg-background">
      <ChatSidebar onConversationSelect={setActiveConversation} />
      <ChatWindow
        conversationName={activeConversation?.name}
        conversationAvatar={activeConversation?.avatar}
      />
      <ChatDetails />
    </div>
  )
}

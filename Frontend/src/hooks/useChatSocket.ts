import { useEffect, useRef } from "react"

import { chatSocketService } from "@/services/chat/chat-socket.service"
import { authTokenStore } from "@/stores/auth-token.store"
import type { ChatMessageResponse } from "@/types/chat"

type Options = {
  /** Kết nối khi có access token. Mặc định true. */
  autoConnect?: boolean
  conversationId?: string
  onMessage?: (message: ChatMessageResponse) => void
}

/**
 * Hook kết nối STOMP (WebSocket) chat qua API Gateway.
 * `authTokenStore` không trigger re-render: sau login, mount lại component hoặc đổi `key` để kết nối lại.
 */
export function useChatSocket({ autoConnect = true, conversationId, onMessage }: Options = {}) {
  const onMessageRef = useRef(onMessage)

  useEffect(() => {
    onMessageRef.current = onMessage
  }, [onMessage])

  useEffect(() => {
    if (!autoConnect || !conversationId || !authTokenStore.get()) {
      return
    }

    let subscription: ReturnType<typeof chatSocketService.subscribeConversation>

    chatSocketService.connect(() => {
      subscription = chatSocketService.subscribeConversation(conversationId, (msg) =>
        onMessageRef.current?.(msg)
      )
    })

    return () => {
      subscription?.unsubscribe()
      chatSocketService.disconnect()
    }
  }, [autoConnect, conversationId])
}

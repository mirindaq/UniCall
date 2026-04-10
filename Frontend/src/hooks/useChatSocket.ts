import { useEffect, useRef } from "react"

import { useAuth } from "@/contexts/auth-context"
import { chatSocketService } from "@/services/chat/chat-socket.service"
import type { ChatMessageResponse } from "@/types/chat"

type Options = {
  /** Kết nối khi có phiên đăng nhập. Mặc định true. */
  autoConnect?: boolean
  conversationId?: string
  onMessage?: (message: ChatMessageResponse) => void
}

/**
 * Hook kết nối STOMP (WebSocket) chat qua API Gateway.
 * Tự kết nối theo trạng thái đăng nhập từ AuthContext.
 */
export function useChatSocket({ autoConnect = true, conversationId, onMessage }: Options = {}) {
  const { isAuthenticated } = useAuth()
  const onMessageRef = useRef(onMessage)

  useEffect(() => {
    onMessageRef.current = onMessage
  }, [onMessage])

  useEffect(() => {
    if (!autoConnect || !conversationId || !isAuthenticated) {
      return
    }

    let subscription: ReturnType<typeof chatSocketService.subscribeConversation>
    const handleConnected = () => {
      subscription = chatSocketService.subscribeConversation(conversationId, (msg) =>
        onMessageRef.current?.(msg)
      )
    }
    const handleDisconnected = () => {
      subscription?.unsubscribe()
      subscription = undefined
    }

    chatSocketService.connect(handleConnected, handleDisconnected)

    return () => {
      subscription?.unsubscribe()
      chatSocketService.disconnect({
        onConnected: handleConnected,
        onDisconnected: handleDisconnected,
      })
    }
  }, [autoConnect, conversationId, isAuthenticated])
}

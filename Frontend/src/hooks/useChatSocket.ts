import { useEffect, useRef } from "react"

import { useAuth } from "@/contexts/auth-context"
import { chatSocketService } from "@/services/chat/chat-socket.service"
import type { UserRealtimeEvent } from "@/types/chat"

type Options = {
  /** Kết nối khi có phiên đăng nhập. Mặc định true. */
  autoConnect?: boolean
  onUserEvent?: (event: UserRealtimeEvent) => void
}

/**
 * Hook kết nối STOMP (WebSocket) chat qua API Gateway.
 * Tự kết nối theo trạng thái đăng nhập từ AuthContext.
 */
export function useChatSocket({
  autoConnect = true,
  onUserEvent,
}: Options = {}) {
  const { isAuthenticated } = useAuth()
  const onUserEventRef = useRef(onUserEvent)

  useEffect(() => {
    onUserEventRef.current = onUserEvent
  }, [onUserEvent])

  useEffect(() => {
    if (!autoConnect || !onUserEventRef.current || !isAuthenticated) {
      return
    }

    let userQueueSubscription: ReturnType<typeof chatSocketService.subscribeUserEvents>
    const handleConnected = () => {
      userQueueSubscription = chatSocketService.subscribeUserEvents((event) =>
        onUserEventRef.current?.(event)
      )
    }
    const handleDisconnected = () => {
      userQueueSubscription?.unsubscribe()
      userQueueSubscription = undefined
    }

    chatSocketService.connect(handleConnected, handleDisconnected)

    return () => {
      userQueueSubscription?.unsubscribe()
      chatSocketService.disconnect({
        onConnected: handleConnected,
        onDisconnected: handleDisconnected,
      })
    }
  }, [autoConnect, isAuthenticated])
}

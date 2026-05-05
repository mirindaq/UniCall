import type { IMessage, StompSubscription } from "@stomp/stompjs"

import { realtimeSocketService } from "@/services/realtime/realtime-socket.service"
import type {
  CallSignalType,
  ChatAttachment,
  ChatMessageResponse,
  UserRealtimeEvent,
} from "@/types/chat"

const parseUserEvent = (raw: IMessage): UserRealtimeEvent =>
  JSON.parse(raw.body) as UserRealtimeEvent

const userEventListeners = new Set<(event: UserRealtimeEvent) => void>()
let userEventSubscription: StompSubscription | undefined
const connectedWrapperByOriginal = new WeakMap<() => void, () => void>()

const ensureUserEventSubscription = () => {
  if (userEventSubscription || userEventListeners.size === 0) {
    return
  }
  userEventSubscription = realtimeSocketService.subscribe("/user/queue/events", (m) => {
    const event = parseUserEvent(m)
    userEventListeners.forEach((listener) => {
      listener(event)
    })
  })
}

const teardownUserEventSubscriptionIfIdle = () => {
  if (userEventListeners.size > 0) {
    return
  }
  userEventSubscription?.unsubscribe()
  userEventSubscription = undefined
}

export const chatSocketService = {
  getClient: () => realtimeSocketService.getClient(),
  waitForConnected: (timeoutMs?: number) => realtimeSocketService.waitForConnected(timeoutMs),

  connect(onConnected?: () => void, onDisconnected?: () => void) {
    let effectiveOnConnected = onConnected
    if (onConnected) {
      const wrappedConnected = () => {
        ensureUserEventSubscription()
        onConnected()
      }
      connectedWrapperByOriginal.set(onConnected, wrappedConnected)
      effectiveOnConnected = wrappedConnected
    }
    return realtimeSocketService.connect(effectiveOnConnected, onDisconnected)
  },

  disconnect(options?: { onConnected?: () => void; onDisconnected?: () => void; force?: boolean }) {
    const mappedOnConnected = options?.onConnected
      ? connectedWrapperByOriginal.get(options.onConnected)
      : undefined
    realtimeSocketService.disconnect({
      ...options,
      onConnected: mappedOnConnected,
    })
    if (options?.onConnected) {
      connectedWrapperByOriginal.delete(options.onConnected)
    }
    if (!realtimeSocketService.getClient()) {
      userEventSubscription = undefined
    }
  },

  subscribeUserEvents(handler: (event: UserRealtimeEvent) => void): StompSubscription | undefined {
    userEventListeners.add(handler)
    ensureUserEventSubscription()
    return {
      id: `user-events-${Math.random().toString(36).slice(2, 10)}`,
      unsubscribe: () => {
        userEventListeners.delete(handler)
        teardownUserEventSubscriptionIfIdle()
      },
    } as StompSubscription
  },

  sendMessage(
    conversationId: string,
    content: string,
    type: ChatMessageResponse["type"] = "TEXT",
    attachments?: Array<Pick<ChatAttachment, "type" | "url" | "size" | "order">>,
    replyToMessageId?: string | null
  ) {
    realtimeSocketService.publish("/app/chat.send", {
      conversationId,
      content,
      type,
      attachments,
      replyToMessageId: replyToMessageId ?? undefined,
    })
  },

  sendCallSignal(
    conversationId: string,
    callId: string,
    type: CallSignalType,
    extras?: {
      audioOnly?: boolean
      targetUserIds?: string[]
      sdp?: string
      candidate?: string
      sdpMid?: string
      sdpMLineIndex?: number
    }
  ) {
    return realtimeSocketService.publish("/app/call.signal", {
      conversationId,
      callId,
      type,
      audioOnly: extras?.audioOnly ?? true,
      targetUserIds: extras?.targetUserIds,
      sdp: extras?.sdp,
      candidate: extras?.candidate,
      sdpMid: extras?.sdpMid,
      sdpMLineIndex: extras?.sdpMLineIndex,
    })
  },
}

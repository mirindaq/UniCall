import { Client, type IMessage, type StompSubscription } from "@stomp/stompjs"

import { buildChatStompBrokerUrl } from "@/constants/api"
import type {
  CallSignalType,
  ChatAttachment,
  ChatMessageResponse,
  ConversationCallSignal,
} from "@/types/chat"

let sharedClient: Client | null = null
let sharedClientRefCount = 0
const connectedListeners = new Set<() => void>()
const disconnectedListeners = new Set<() => void>()

const parseMessage = (raw: IMessage): ChatMessageResponse => JSON.parse(raw.body) as ChatMessageResponse
const parseCallSignal = (raw: IMessage): ConversationCallSignal =>
  JSON.parse(raw.body) as ConversationCallSignal

export const chatSocketService = {
  getClient: () => sharedClient,

  /**
   * Kích hoạt STOMP qua WebSocket thuần (không SockJS) — xác thực dựa trên HttpOnly cookie.
   */
  connect(onConnected?: () => void, onDisconnected?: () => void): Client {
    if (onConnected) {
      connectedListeners.add(onConnected)
    }
    if (onDisconnected) {
      disconnectedListeners.add(onDisconnected)
    }
    sharedClientRefCount += 1

    if (sharedClient) {
      if (sharedClient.connected && onConnected) {
        queueMicrotask(() => onConnected())
      }
      return sharedClient
    }

    const client = new Client({
      brokerURL: buildChatStompBrokerUrl(),
      reconnectDelay: 5000,
      heartbeatIncoming: 10_000,
      heartbeatOutgoing: 10_000,
      onConnect: () => {
        connectedListeners.forEach((listener) => {
          listener()
        })
      },
      onDisconnect: () => {
        disconnectedListeners.forEach((listener) => {
          listener()
        })
      },
      onStompError: (frame) => {
        console.error("[chat stomp]", frame.headers.message, frame.body)
      },
      onWebSocketError: (event) => {
        console.error("[chat ws]", event)
      },
    })

    client.activate()
    sharedClient = client
    return client
  },

  disconnect(options?: { onConnected?: () => void; onDisconnected?: () => void; force?: boolean }) {
    if (options?.onConnected) {
      connectedListeners.delete(options.onConnected)
    }
    if (options?.onDisconnected) {
      disconnectedListeners.delete(options.onDisconnected)
    }

    if (!options?.force) {
      sharedClientRefCount = Math.max(0, sharedClientRefCount - 1)
    }

    if (!options?.force && sharedClientRefCount > 0) {
      return
    }

    sharedClientRefCount = 0
    connectedListeners.clear()
    disconnectedListeners.clear()
    void sharedClient?.deactivate()
    sharedClient = null
  },

  subscribeConversation(
    conversationId: string,
    handler: (message: ChatMessageResponse) => void
  ): StompSubscription | undefined {
    const client = sharedClient
    if (!client?.connected) {
      return undefined
    }
    return client.subscribe(`/topic/conversations.${conversationId}.messages`, (m) => {
      handler(parseMessage(m))
    })
  },

  subscribeConversationCalls(
    conversationId: string,
    handler: (signal: ConversationCallSignal) => void
  ): StompSubscription | undefined {
    const client = sharedClient
    if (!client?.connected) {
      return undefined
    }
    return client.subscribe(`/topic/conversations.${conversationId}.calls`, (m) => {
      handler(parseCallSignal(m))
    })
  },

  sendMessage(
    conversationId: string,
    content: string,
    type: ChatMessageResponse["type"] = "TEXT",
    attachments?: Array<Pick<ChatAttachment, "type" | "url" | "size" | "order">>,
    replyToMessageId?: string | null
  ) {
    sharedClient?.publish({
      destination: "/app/chat.send",
      body: JSON.stringify({
        conversationId,
        content,
        type,
        attachments,
        replyToMessageId: replyToMessageId ?? undefined,
      }),
      headers: { "content-type": "application/json" },
    })
  },

  sendCallSignal(
    conversationId: string,
    callId: string,
    type: CallSignalType,
    extras?: {
      audioOnly?: boolean
      sdp?: string
      candidate?: string
      sdpMid?: string
      sdpMLineIndex?: number
    }
  ) {
    sharedClient?.publish({
      destination: "/app/call.signal",
      body: JSON.stringify({
        conversationId,
        callId,
        type,
        audioOnly: extras?.audioOnly ?? true,
        sdp: extras?.sdp,
        candidate: extras?.candidate,
        sdpMid: extras?.sdpMid,
        sdpMLineIndex: extras?.sdpMLineIndex,
      }),
      headers: { "content-type": "application/json" },
    })
  },
}

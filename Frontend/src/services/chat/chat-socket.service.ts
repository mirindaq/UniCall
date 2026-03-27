import { Client, type IMessage, type StompSubscription } from "@stomp/stompjs"

import { buildChatStompBrokerUrl } from "@/constants/api"
import { authTokenStore } from "@/stores/auth-token.store"
import type { ChatMessageResponse } from "@/types/chat"

let sharedClient: Client | null = null

const parseMessage = (raw: IMessage): ChatMessageResponse => JSON.parse(raw.body) as ChatMessageResponse

export const chatSocketService = {
  getClient: () => sharedClient,

  /**
   * Kích hoạt STOMP qua WebSocket thuần (không SockJS) — tương thích cách xác thực query trên gateway.
   */
  connect(onConnected?: () => void, onDisconnected?: () => void): Client {
    const token = authTokenStore.get()
    if (!token) {
      throw new Error("Chưa có access token để kết nối chat WebSocket")
    }

    if (sharedClient?.active) {
      onConnected?.()
      return sharedClient
    }

    const client = new Client({
      brokerURL: buildChatStompBrokerUrl(token),
      reconnectDelay: 5000,
      heartbeatIncoming: 10_000,
      heartbeatOutgoing: 10_000,
      onConnect: onConnected,
      onDisconnect: onDisconnected,
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

  disconnect() {
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

  sendMessage(conversationId: string, content: string, type: ChatMessageResponse["type"] = "TEXT") {
    sharedClient?.publish({
      destination: "/app/chat.send",
      body: JSON.stringify({ conversationId, content, type }),
      headers: { "content-type": "application/json" },
    })
  },
}

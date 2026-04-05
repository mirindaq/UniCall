import { Client, type IMessage, type StompSubscription } from "@stomp/stompjs"

import { buildChatStompBrokerUrl } from "@/constants/api"
import type { ChatAttachment, ChatMessageResponse } from "@/types/chat"

let sharedClient: Client | null = null

const parseMessage = (raw: IMessage): ChatMessageResponse => JSON.parse(raw.body) as ChatMessageResponse

export const chatSocketService = {
  getClient: () => sharedClient,

  /**
   * Kích hoạt STOMP qua WebSocket thuần (không SockJS) — xác thực dựa trên HttpOnly cookie.
   */
  connect(onConnected?: () => void, onDisconnected?: () => void): Client {
    if (sharedClient?.active) {
      onConnected?.()
      return sharedClient
    }

    const client = new Client({
      brokerURL: buildChatStompBrokerUrl(),
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

  sendMessage(
    conversationId: string,
    content: string,
    type: ChatMessageResponse["type"] = "TEXT",
    attachments?: Array<Pick<ChatAttachment, "type" | "url" | "size" | "order">>
  ) {
    sharedClient?.publish({
      destination: "/app/chat.send",
      body: JSON.stringify({ conversationId, content, type, attachments }),
      headers: { "content-type": "application/json" },
    })
  },
}

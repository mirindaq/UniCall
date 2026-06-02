import { Client, type IMessage, type StompSubscription } from "@stomp/stompjs"

import { buildIdentityStompBrokerUrl } from "@/constants/api"
import type { SecurityRealtimeEvent } from "@/types/security-realtime"

const parseSecurityEvent = (raw: IMessage): SecurityRealtimeEvent =>
  JSON.parse(raw.body) as SecurityRealtimeEvent

let sharedClient: Client | null = null
let securityEventSubscription: StompSubscription | undefined
const securityEventListeners = new Set<(event: SecurityRealtimeEvent) => void>()

const ensureSecurityEventSubscription = () => {
  if (securityEventSubscription || securityEventListeners.size === 0 || !sharedClient?.connected) {
    return
  }

  securityEventSubscription = sharedClient.subscribe("/user/queue/security-events", (message) => {
    const event = parseSecurityEvent(message)
    securityEventListeners.forEach((listener) => {
      listener(event)
    })
  })
}

export const identitySocketService = {
  connect() {
    if (sharedClient) {
      if (sharedClient.connected) {
        ensureSecurityEventSubscription()
      }
      return sharedClient
    }

    sharedClient = new Client({
      brokerURL: buildIdentityStompBrokerUrl(),
      reconnectDelay: 5000,
      heartbeatIncoming: 10_000,
      heartbeatOutgoing: 10_000,
      onConnect: () => {
        ensureSecurityEventSubscription()
      },
      onStompError: (frame) => {
        console.error("[identity stomp]", frame.headers.message, frame.body)
      },
      onWebSocketError: (event) => {
        console.error("[identity ws]", event)
      },
    })

    sharedClient.activate()
    return sharedClient
  },

  disconnect() {
    securityEventSubscription?.unsubscribe()
    securityEventSubscription = undefined
    void sharedClient?.deactivate()
    sharedClient = null
  },

  subscribeSecurityEvents(handler: (event: SecurityRealtimeEvent) => void): StompSubscription {
    securityEventListeners.add(handler)
    ensureSecurityEventSubscription()
    return {
      id: `security-events-${Math.random().toString(36).slice(2, 10)}`,
      unsubscribe: () => {
        securityEventListeners.delete(handler)
        if (securityEventListeners.size === 0) {
          securityEventSubscription?.unsubscribe()
          securityEventSubscription = undefined
        }
      },
    } as StompSubscription
  },
}

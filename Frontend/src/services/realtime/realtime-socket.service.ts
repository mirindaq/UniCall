import { Client, type IMessage, type StompSubscription } from "@stomp/stompjs"

import { buildChatStompBrokerUrl } from "@/constants/api"

let sharedClient: Client | null = null
let sharedClientRefCount = 0
const connectedListeners = new Set<() => void>()
const disconnectedListeners = new Set<() => void>()

export const realtimeSocketService = {
  getClient: () => sharedClient,

  async waitForConnected(timeoutMs = 5000): Promise<boolean> {
    const startedAt = Date.now()
    while (Date.now() - startedAt < timeoutMs) {
      const client = sharedClient
      if (client?.connected) {
        return true
      }
      await new Promise((resolve) => window.setTimeout(resolve, 80))
    }
    return false
  },

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

  subscribe(destination: string, handler: (message: IMessage) => void): StompSubscription | undefined {
    const client = sharedClient
    if (!client?.connected) {
      return undefined
    }
    return client.subscribe(destination, handler)
  },

  publish(destination: string, body: unknown) {
    if (!sharedClient?.connected) {
      return false
    }
    sharedClient.publish({
      destination,
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
    })
    return true
  },
}

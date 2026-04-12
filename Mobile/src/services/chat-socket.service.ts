import { Client, type IMessage, type StompSubscription } from '@stomp/stompjs';
import { Platform } from 'react-native';

import axiosClient, { authTokenStore } from '@/configurations/axios.config';
import { API_WS_PREFIXES } from '@/constants/api-prefixes';
import type {
  CallSignalType,
  ChatAttachment,
  ChatMessageResponse,
  UserRealtimeEvent,
} from '@/types/chat';

let sharedClient: Client | null = null;
let pendingOnConnectedCallbacks: (() => void)[] = [];
let pendingOnDisconnectedCallbacks: (() => void)[] = [];
const userEventListeners = new Set<(event: UserRealtimeEvent) => void>();
let userEventSubscription: StompSubscription | undefined;

const parseMessage = (raw: IMessage): ChatMessageResponse => JSON.parse(raw.body) as ChatMessageResponse;
const parseUserEvent = (raw: IMessage): UserRealtimeEvent => JSON.parse(raw.body) as UserRealtimeEvent;

type MobileWebSocketCtor = new (
  url: string,
  protocols?: string | string[],
  options?: { headers?: Record<string, string> }
) => WebSocket;

const buildChatStompBrokerUrl = () => {
  const baseUrl = ((axiosClient.defaults.baseURL as string) || '').replace(/\/+$/, '');
  if (!baseUrl) {
    return API_WS_PREFIXES.chat;
  }

  try {
    const parsed = new URL(baseUrl);
    const wsProtocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProtocol}//${parsed.host}${API_WS_PREFIXES.chat}`;
  } catch {
    const wsBase = baseUrl
      .replace(/^https?:\/\//i, (scheme) => (scheme.toLowerCase() === 'https://' ? 'wss://' : 'ws://'))
      .replace(/\/api-gateway$/i, '');
    return `${wsBase}${API_WS_PREFIXES.chat}`;
  }
};

const ensureUserEventSubscription = () => {
  const client = sharedClient;
  if (!client?.connected || userEventSubscription || userEventListeners.size === 0) {
    return;
  }
  userEventSubscription = client.subscribe('/user/queue/events', (m) => {
    const event = parseUserEvent(m);
    userEventListeners.forEach((listener) => {
      listener(event);
    });
  });
};

const teardownUserEventSubscriptionIfIdle = () => {
  if (userEventListeners.size > 0) {
    return;
  }
  userEventSubscription?.unsubscribe();
  userEventSubscription = undefined;
};

const waitForConnected = async (timeoutMs = 5000) => {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const client = sharedClient;
    if (client?.connected) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 80));
  }
  return false;
};

export const chatSocketService = {
  getClient: () => sharedClient,
  waitForConnected,

  async connect(onConnected?: () => void, onDisconnected?: () => void): Promise<Client> {
    if (sharedClient?.active) {
      if (sharedClient.connected) {
        ensureUserEventSubscription();
        onConnected?.();
      } else if (onConnected) {
        pendingOnConnectedCallbacks.push(onConnected);
      }
      if (onDisconnected) {
        pendingOnDisconnectedCallbacks.push(onDisconnected);
      }
      return sharedClient;
    }

    const accessToken = await authTokenStore.get();
    const brokerURL = buildChatStompBrokerUrl();

    const client = new Client({
      webSocketFactory: () => {
        if (Platform.OS === 'web') {
          return new WebSocket(brokerURL);
        }
        const NativeWebSocket = WebSocket as unknown as MobileWebSocketCtor;
        return new NativeWebSocket(brokerURL, [], {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        });
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 10_000,
      heartbeatOutgoing: 10_000,
      onConnect: () => {
        console.log('[mobile chat ws] connected');
        onConnected?.();
        pendingOnConnectedCallbacks.forEach((callback) => callback());
        pendingOnConnectedCallbacks = [];
        ensureUserEventSubscription();
      },
      onDisconnect: () => {
        console.log('[mobile chat ws] disconnected');
        onDisconnected?.();
        pendingOnDisconnectedCallbacks.forEach((callback) => callback());
        userEventSubscription = undefined;
      },
      onStompError: (frame) => {
        console.error('[mobile chat stomp]', frame.headers.message, frame.body);
      },
      onWebSocketError: (event) => {
        console.error('[mobile chat ws]', event);
      },
    });

    client.activate();
    sharedClient = client;
    return client;
  },

  disconnect() {
    void sharedClient?.deactivate();
    sharedClient = null;
    pendingOnConnectedCallbacks = [];
    pendingOnDisconnectedCallbacks = [];
    userEventSubscription = undefined;
  },

  subscribeUserEvents(handler: (event: UserRealtimeEvent) => void): StompSubscription | undefined {
    userEventListeners.add(handler);
    ensureUserEventSubscription();
    return {
      id: `mobile-user-events-${Math.random().toString(36).slice(2, 10)}`,
      unsubscribe: () => {
        userEventListeners.delete(handler);
        teardownUserEventSubscriptionIfIdle();
      },
    } as StompSubscription;
  },

  subscribeConversation(
    conversationId: string,
    handler: (message: ChatMessageResponse) => void
  ): StompSubscription | undefined {
    const client = sharedClient;
    if (!client?.connected) {
      return undefined;
    }
    return client.subscribe(`/topic/conversations.${conversationId}.messages`, (m) => {
      handler(parseMessage(m));
    });
  },

  sendMessage(
    conversationId: string,
    content: string,
    type: ChatMessageResponse['type'] = 'TEXT',
    attachments?: Pick<ChatAttachment, 'type' | 'url' | 'size' | 'order'>[],
    replyToMessageId?: string | null
  ) {
    const client = sharedClient;
    if (!client?.connected) {
      return false;
    }
    client.publish({
      destination: '/app/chat.send',
      body: JSON.stringify({
        conversationId,
        content,
        type,
        attachments,
        replyToMessageId: replyToMessageId ?? undefined,
      }),
      headers: { 'content-type': 'application/json' },
    });
    return true;
  },

  sendCallSignal(
    conversationId: string,
    callId: string,
    type: CallSignalType,
    extras?: {
      audioOnly?: boolean;
      sdp?: string;
      candidate?: string;
      sdpMid?: string;
      sdpMLineIndex?: number;
    }
  ) {
    const client = sharedClient;
    if (!client?.connected) {
      return false;
    }
    client.publish({
      destination: '/app/call.signal',
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
      headers: { 'content-type': 'application/json' },
    });
    return true;
  },
};

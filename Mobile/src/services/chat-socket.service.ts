import { Client, type IMessage, type StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

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
const MOBILE_CLIENT_TYPE = 'mobile';

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
    return 'http://localhost:8083/ws';
  }

  try {
    const parsed = new URL(baseUrl);
    // Mobile connect trực tiếp tới chat-service port 8083 (SockJS)
    return `${parsed.protocol}//${parsed.hostname}:8083/ws`;
  } catch {
    // Fallback: extract host from baseUrl string
    const hostMatch = baseUrl.match(/https?:\/\/([^:\/]+)/);
    if (hostMatch) {
      const protocol = baseUrl.startsWith('https') ? 'https:' : 'http:';
      return `${protocol}//${hostMatch[1]}:8083/ws`;
    }
    return 'http://localhost:8083/ws';
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

const buildSocketAuthHeaders = async (): Promise<Record<string, string>> => {
  const accessToken = await authTokenStore.get();
  const headers: Record<string, string> = {
    'X-Client-Type': MOBILE_CLIENT_TYPE,
  };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  return headers;
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

    const baseURL = buildChatStompBrokerUrl();
    const accessToken = await authTokenStore.get();
    const brokerURL = accessToken ? `${baseURL}?access_token=${accessToken}` : baseURL;
    console.log('[UniCall Mobile] Connecting to SockJS URL (with token):', baseURL + '?access_token=***');

    const client = new Client({
      // SockJS WebSocket factory - tương thích tốt với React Native
      webSocketFactory: () => {
        console.log('[UniCall Mobile] Creating SockJS connection');
        return new SockJS(brokerURL) as any;
      },
      // Token đã gửi qua query param, không cần trong STOMP headers
      connectHeaders: {},
      reconnectDelay: 5000,
      heartbeatIncoming: 10_000,
      heartbeatOutgoing: 10_000,
      debug: (str) => {
        console.log('[UniCall STOMP Debug]', str);
      },
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
      onWebSocketClose: (event) => {
        console.warn('[mobile chat ws] closed', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
        });
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
    console.log('[UniCall Mobile] subscribeConversation called:', {
      conversationId,
      clientActive: client?.active,
      clientConnected: client?.connected,
    });
    if (!client?.connected) {
      console.warn('[UniCall Mobile] Cannot subscribe - client not connected');
      return undefined;
    }
    const destination = `/topic/conversations.${conversationId}.messages`;
    console.log('[UniCall Mobile] Subscribing to:', destination);
    const subscription = client.subscribe(destination, (m) => {
      console.log('[UniCall Mobile] Received message from conversation:', conversationId);
      handler(parseMessage(m));
    });
    console.log('[UniCall Mobile] Subscription created:', subscription?.id);
    return subscription;
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

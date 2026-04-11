import { Client, type IMessage, type StompSubscription } from '@stomp/stompjs';
import { Platform } from 'react-native';

import axiosClient, { authTokenStore } from '@/configurations/axios.config';
import type { ChatAttachment, ChatMessageResponse } from '@/types/chat';

let sharedClient: Client | null = null;
let pendingOnConnectedCallbacks: (() => void)[] = [];
let pendingOnDisconnectedCallbacks: (() => void)[] = [];

const parseMessage = (raw: IMessage): ChatMessageResponse => JSON.parse(raw.body) as ChatMessageResponse;

type MobileWebSocketCtor = new (
  url: string,
  protocols?: string | string[],
  options?: { headers?: Record<string, string> }
) => WebSocket;

const buildChatStompBrokerUrl = () => {
  const baseUrl = (axiosClient.defaults.baseURL as string) || '';
  const wsBase = baseUrl.replace(/^http/i, (scheme) => (scheme.toLowerCase() === 'https' ? 'wss' : 'ws'));
  return `${wsBase}/chat-service/ws`;
};

export const chatSocketService = {
  getClient: () => sharedClient,

  async connect(onConnected?: () => void, onDisconnected?: () => void): Promise<Client> {
    if (sharedClient?.active) {
      if (sharedClient.connected) {
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
      },
      onDisconnect: () => {
        console.log('[mobile chat ws] disconnected');
        onDisconnected?.();
        pendingOnDisconnectedCallbacks.forEach((callback) => callback());
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
    sharedClient?.publish({
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
  },
};

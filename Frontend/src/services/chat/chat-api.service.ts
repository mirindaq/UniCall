import axiosClient from "@/configurations/axios.config"
import type { PageResponse, ResponseSuccess } from "@/types/api-response"
import type { ChatAttachment, ChatMessageResponse, ConversationResponse } from "@/types/chat"

const CHAT_PREFIX = "/chat-service/api/v1/chat"

export const chatApiService = {
  listConversations: async () => {
    const { data } = await axiosClient.get<ResponseSuccess<ConversationResponse[]>>(`${CHAT_PREFIX}/conversations`)
    return data
  },

  getOrCreateDirect: async (otherUserId: string) => {
    const { data } = await axiosClient.post<ResponseSuccess<ConversationResponse>>(
      `${CHAT_PREFIX}/conversations/direct`,
      { otherUserId }
    )
    return data
  },

  listMessages: async (conversationId: string, page = 1, limit = 20) => {
    const { data } = await axiosClient.get<ResponseSuccess<PageResponse<ChatMessageResponse>>>(
      `${CHAT_PREFIX}/conversations/${encodeURIComponent(conversationId)}/messages`,
      { params: { page, limit } }
    )
    return data
  },

  sendMessageRest: async (
    conversationId: string,
    content: string,
    type: ChatMessageResponse["type"] = "TEXT",
    attachments?: Array<Pick<ChatAttachment, "type" | "url" | "size" | "order">>
  ) => {
    const { data } = await axiosClient.post<ResponseSuccess<ChatMessageResponse>>(
      `${CHAT_PREFIX}/conversations/${encodeURIComponent(conversationId)}/messages`,
      { content, type, attachments }
    )
    return data
  },
}

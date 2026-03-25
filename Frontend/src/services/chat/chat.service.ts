import axiosClient from "@/configurations/axios.config"
import type { ResponseSuccess } from "@/types/api-response"
import type {
  CreateGroupConversationRequest,
  CreateGroupConversationResponse,
} from "@/types/chat"

const CHAT_API_PREFIX = "/chat-service/api/v1/conversations"

export const chatService = {
  createGroupConversation: async (
    payload: CreateGroupConversationRequest
  ): Promise<ResponseSuccess<CreateGroupConversationResponse>> => {
    const response = await axiosClient.post<
      ResponseSuccess<CreateGroupConversationResponse>
    >(`${CHAT_API_PREFIX}/groups`, payload)
    return response.data
  },
}

import axiosClient from "@/configurations/axios.config"
import { API_PREFIXES } from "@/constants/api-prefixes"
import type { PageResponse, ResponseSuccess } from "@/types/api-response"
import type {
  AssistantAskRequest,
  AssistantAskResponse,
  AssistantThreadMessageResponse,
  AssistantThreadResponse,
} from "@/types/assistant"

const AI_CHAT_PREFIX = API_PREFIXES.aiChat

export const assistantService = {
  ask: async (payload: AssistantAskRequest) => {
    const { data } = await axiosClient.post<ResponseSuccess<AssistantAskResponse>>(
      `${AI_CHAT_PREFIX}/ask`,
      payload
    )
    return data
  },
  getDefaultThread: async () => {
    const { data } = await axiosClient.get<ResponseSuccess<AssistantThreadResponse>>(
      `${AI_CHAT_PREFIX}/thread`
    )
    return data
  },
  listMessages: async (threadId?: string, page = 1, limit = 50) => {
    const { data } = await axiosClient.get<ResponseSuccess<PageResponse<AssistantThreadMessageResponse>>>(
      `${AI_CHAT_PREFIX}/messages`,
      {
        params: {
          threadId: threadId || undefined,
          page,
          limit,
        },
      }
    )
    return data
  },
}

import axiosClient from "@/configurations/axios.config"
import type { PageResponse, ResponseSuccess } from "@/types/api-response"
import type {
  AddGroupMembersRequest,
  ChatAttachment,
  ChatMessageResponse,
  ConversationResponse,
  CreateGroupConversationRequest,
  CreateGroupConversationResponse,
  DissolveGroupConversationResponse,
  ManageGroupParticipantsResponse,
  TransferGroupAdminRequest,
  UpdateGroupMemberRoleRequest,
} from "@/types/chat"

const CHAT_API_PREFIX = "/chat-service/api/v1/conversations"
const CHAT_PREFIX = "/chat-service/api/v1/chat"

export const chatService = {
  listConversations: async () => {
    const { data } = await axiosClient.get<ResponseSuccess<ConversationResponse[]>>(
      `${CHAT_PREFIX}/conversations`
    )
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
  createGroupConversation: async (
    payload: CreateGroupConversationRequest
  ): Promise<ResponseSuccess<CreateGroupConversationResponse>> => {
    const response = await axiosClient.post<
      ResponseSuccess<CreateGroupConversationResponse>
    >(`${CHAT_API_PREFIX}/groups`, payload)
    return response.data
  },
  addGroupMembers: async (
    conversationId: string,
    payload: AddGroupMembersRequest
  ): Promise<ResponseSuccess<ManageGroupParticipantsResponse>> => {
    const response = await axiosClient.post<
      ResponseSuccess<ManageGroupParticipantsResponse>
    >(
      `${CHAT_API_PREFIX}/${encodeURIComponent(conversationId)}/members`,
      payload
    )
    return response.data
  },
  removeGroupMember: async (
    conversationId: string,
    memberIdentityUserId: string
  ): Promise<ResponseSuccess<ManageGroupParticipantsResponse>> => {
    const response = await axiosClient.delete<
      ResponseSuccess<ManageGroupParticipantsResponse>
    >(
      `${CHAT_API_PREFIX}/${encodeURIComponent(conversationId)}/members/${encodeURIComponent(memberIdentityUserId)}`
    )
    return response.data
  },
  updateGroupMemberRole: async (
    conversationId: string,
    memberIdentityUserId: string,
    payload: UpdateGroupMemberRoleRequest
  ): Promise<ResponseSuccess<ManageGroupParticipantsResponse>> => {
    const response = await axiosClient.patch<
      ResponseSuccess<ManageGroupParticipantsResponse>
    >(
      `${CHAT_API_PREFIX}/${encodeURIComponent(conversationId)}/members/${encodeURIComponent(memberIdentityUserId)}/role`,
      payload
    )
    return response.data
  },
  getGroupConversationDetails: async (
    conversationId: string
  ): Promise<ResponseSuccess<ManageGroupParticipantsResponse>> => {
    const response = await axiosClient.get<ResponseSuccess<ManageGroupParticipantsResponse>>(
      `${CHAT_API_PREFIX}/${encodeURIComponent(conversationId)}/group-details`
    )
    return response.data
  },
  transferGroupAdmin: async (
    conversationId: string,
    payload: TransferGroupAdminRequest
  ): Promise<ResponseSuccess<ManageGroupParticipantsResponse>> => {
    const response = await axiosClient.patch<ResponseSuccess<ManageGroupParticipantsResponse>>(
      `${CHAT_API_PREFIX}/${encodeURIComponent(conversationId)}/transfer-admin`,
      payload
    )
    return response.data
  },
  leaveGroupConversation: async (
    conversationId: string
  ): Promise<ResponseSuccess<ManageGroupParticipantsResponse>> => {
    const response = await axiosClient.post<ResponseSuccess<ManageGroupParticipantsResponse>>(
      `${CHAT_API_PREFIX}/${encodeURIComponent(conversationId)}/leave`
    )
    return response.data
  },
  dissolveGroupConversation: async (
    conversationId: string
  ): Promise<ResponseSuccess<DissolveGroupConversationResponse>> => {
    const response = await axiosClient.delete<ResponseSuccess<DissolveGroupConversationResponse>>(
      `${CHAT_API_PREFIX}/${encodeURIComponent(conversationId)}/dissolve`
    )
    return response.data
  },
}

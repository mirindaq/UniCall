import axiosClient from "@/configurations/axios.config"
import { API_PREFIXES } from "@/constants/api-prefixes"
import type { PageResponse, ResponseSuccess } from "@/types/api-response"
import type {
  AddGroupMembersRequest,
  ChatAttachment,
  ChatMessageResponse,
  ConversationBlockStatusResponse,
  ConversationResponse,
  CreateGroupConversationRequest,
  CreateGroupConversationResponse,
  DissolveGroupConversationResponse,
  ManageGroupParticipantsResponse,
  ForwardMessageRequest,
  ForwardMessageResponse,
  TransferGroupAdminRequest,
  SfuAccessTokenResponse,
  UpdateGroupAvatarRequest,
  UpdateGroupMemberRoleRequest,
  UpdateGroupManagementSettingsRequest,
  UpdateMemberNicknameRequest,
} from "@/types/chat"

const CHAT_API_PREFIX = API_PREFIXES.conversations
const CHAT_PREFIX = API_PREFIXES.chat

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
  markConversationAsRead: async (conversationId: string) => {
    const { data } = await axiosClient.post<ResponseSuccess<void>>(
      `${CHAT_PREFIX}/conversations/${encodeURIComponent(conversationId)}/read`
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
  searchMessages: async (conversationId: string, keyword: string, page = 1, limit = 50) => {
    const { data } = await axiosClient.get<ResponseSuccess<PageResponse<ChatMessageResponse>>>(
      `${CHAT_PREFIX}/conversations/${encodeURIComponent(conversationId)}/messages/search`,
      { params: { keyword, page, limit } }
    )
    return data
  },
  getMessageById: async (conversationId: string, messageId: string) => {
    const { data } = await axiosClient.get<ResponseSuccess<ChatMessageResponse>>(
      `${CHAT_PREFIX}/conversations/${encodeURIComponent(conversationId)}/messages/${encodeURIComponent(messageId)}`
    )
    return data
  },
  sendMessageRest: async (
    conversationId: string,
    content: string,
    type: ChatMessageResponse["type"] = "TEXT",
    attachments?: Array<Pick<ChatAttachment, "type" | "url" | "size" | "order">>,
    replyToMessageId?: string | null
  ) => {
    const { data } = await axiosClient.post<ResponseSuccess<ChatMessageResponse>>(
      `${CHAT_PREFIX}/conversations/${encodeURIComponent(conversationId)}/messages`,
      { content, type, attachments, replyToMessageId: replyToMessageId ?? undefined }
    )
    return data
  },
  recallMessage: async (conversationId: string, messageId: string) => {
    const { data } = await axiosClient.post<ResponseSuccess<ChatMessageResponse>>(
      `${CHAT_PREFIX}/conversations/${encodeURIComponent(conversationId)}/messages/${encodeURIComponent(messageId)}/recall`
    )
    return data
  },
  pinMessage: async (conversationId: string, messageId: string) => {
    const { data } = await axiosClient.post<ResponseSuccess<ChatMessageResponse>>(
      `${CHAT_PREFIX}/conversations/${encodeURIComponent(conversationId)}/messages/${encodeURIComponent(messageId)}/pin`
    )
    return data
  },
  unpinMessage: async (conversationId: string, messageId: string) => {
    const { data } = await axiosClient.delete<ResponseSuccess<ChatMessageResponse>>(
      `${CHAT_PREFIX}/conversations/${encodeURIComponent(conversationId)}/messages/${encodeURIComponent(messageId)}/pin`
    )
    return data
  },
  reactMessage: async (conversationId: string, messageId: string, reaction: string) => {
    const { data } = await axiosClient.patch<ResponseSuccess<ChatMessageResponse>>(
      `${CHAT_PREFIX}/conversations/${encodeURIComponent(conversationId)}/messages/${encodeURIComponent(messageId)}/reaction`,
      { reaction },
    )
    return data
  },
  clearReaction: async (conversationId: string, messageId: string) => {
    const { data } = await axiosClient.delete<ResponseSuccess<ChatMessageResponse>>(
      `${CHAT_PREFIX}/conversations/${encodeURIComponent(conversationId)}/messages/${encodeURIComponent(messageId)}/reaction`,
    )
    return data
  },
  pinConversation: async (conversationId: string) => {
    const { data } = await axiosClient.post<ResponseSuccess<ConversationResponse>>(
      `${CHAT_PREFIX}/conversations/${encodeURIComponent(conversationId)}/pin`,
    )
    return data
  },
  unpinConversation: async (conversationId: string) => {
    const { data } = await axiosClient.delete<ResponseSuccess<ConversationResponse>>(
      `${CHAT_PREFIX}/conversations/${encodeURIComponent(conversationId)}/pin`,
    )
    return data
  },
  getConversationBlockStatus: async (conversationId: string) => {
    const { data } = await axiosClient.get<ResponseSuccess<ConversationBlockStatusResponse>>(
      `${CHAT_PREFIX}/conversations/${encodeURIComponent(conversationId)}/block-status`,
    )
    return data
  },
  blockConversation: async (conversationId: string) => {
    const { data } = await axiosClient.post<ResponseSuccess<ConversationBlockStatusResponse>>(
      `${CHAT_PREFIX}/conversations/${encodeURIComponent(conversationId)}/block`,
    )
    return data
  },
  unblockConversation: async (conversationId: string) => {
    const { data } = await axiosClient.delete<ResponseSuccess<ConversationBlockStatusResponse>>(
      `${CHAT_PREFIX}/conversations/${encodeURIComponent(conversationId)}/block`,
    )
    return data
  },
  forwardMessage: async (
    conversationId: string,
    messageId: string,
    payload: ForwardMessageRequest
  ) => {
    const { data } = await axiosClient.post<ResponseSuccess<ForwardMessageResponse>>(
      `${CHAT_PREFIX}/conversations/${encodeURIComponent(conversationId)}/messages/${encodeURIComponent(messageId)}/forward`,
      payload
    )
    return data
  },
  hideMessageForMe: async (conversationId: string, messageId: string) => {
    const { data } = await axiosClient.delete<ResponseSuccess<void>>(
      `${CHAT_PREFIX}/conversations/${encodeURIComponent(conversationId)}/messages/${encodeURIComponent(messageId)}/self`
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
  updateMemberNickname: async (
    conversationId: string,
    memberIdentityUserId: string,
    payload: UpdateMemberNicknameRequest
  ): Promise<ResponseSuccess<ManageGroupParticipantsResponse>> => {
    const response = await axiosClient.patch<
      ResponseSuccess<ManageGroupParticipantsResponse>
    >(
      `${CHAT_API_PREFIX}/${encodeURIComponent(conversationId)}/members/${encodeURIComponent(memberIdentityUserId)}/nickname`,
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
  updateGroupManagementSettings: async (
    conversationId: string,
    payload: UpdateGroupManagementSettingsRequest
  ): Promise<ResponseSuccess<ManageGroupParticipantsResponse>> => {
    const response = await axiosClient.patch<ResponseSuccess<ManageGroupParticipantsResponse>>(
      `${CHAT_API_PREFIX}/${encodeURIComponent(conversationId)}/management-settings`,
      payload
    )
    return response.data
  },
  updateGroupAvatar: async (
    conversationId: string,
    payload: UpdateGroupAvatarRequest
  ): Promise<ResponseSuccess<ManageGroupParticipantsResponse>> => {
    const response = await axiosClient.patch<ResponseSuccess<ManageGroupParticipantsResponse>>(
      `${CHAT_API_PREFIX}/${encodeURIComponent(conversationId)}/avatar`,
      payload
    )
    return response.data
  },
  approveGroupMemberRequest: async (
    conversationId: string,
    requestId: string
  ): Promise<ResponseSuccess<ManageGroupParticipantsResponse>> => {
    const response = await axiosClient.post<ResponseSuccess<ManageGroupParticipantsResponse>>(
      `${CHAT_API_PREFIX}/${encodeURIComponent(conversationId)}/member-requests/${encodeURIComponent(requestId)}/approve`
    )
    return response.data
  },
  rejectGroupMemberRequest: async (
    conversationId: string,
    requestId: string
  ): Promise<ResponseSuccess<ManageGroupParticipantsResponse>> => {
    const response = await axiosClient.delete<ResponseSuccess<ManageGroupParticipantsResponse>>(
      `${CHAT_API_PREFIX}/${encodeURIComponent(conversationId)}/member-requests/${encodeURIComponent(requestId)}`
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
  createConversationSfuToken: async (
    conversationId: string,
    callId?: string
  ): Promise<ResponseSuccess<SfuAccessTokenResponse>> => {
    const response = await axiosClient.post<ResponseSuccess<SfuAccessTokenResponse>>(
      `${CHAT_API_PREFIX}/${encodeURIComponent(conversationId)}/calls/sfu-token`,
      {
        callId,
      }
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

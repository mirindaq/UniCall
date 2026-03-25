import axiosClient from "@/configurations/axios.config"
import type { ResponseSuccess } from "@/types/api-response"
import type {
  AddGroupMembersRequest,
  CreateGroupConversationRequest,
  CreateGroupConversationResponse,
  ManageGroupParticipantsResponse,
  UpdateGroupMemberRoleRequest,
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
}

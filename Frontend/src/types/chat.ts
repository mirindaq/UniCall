export type CreateGroupConversationRequest = {
  name: string
  memberIdentityUserIds: string[]
}

export type CreateGroupConversationResponse = {
  idConversation: string
  name: string
  numberMember: number
  dateCreate: string
  participantIdentityUserIds: string[]
}

export type GroupParticipantRole = "ADMIN" | "DEPUTY" | "USER"

export type GroupParticipantInfo = {
  idAccount: string
  role: GroupParticipantRole
  nickname: string
  dateJoin: string
}

export type ManageGroupParticipantsResponse = {
  idConversation: string
  name: string
  numberMember: number
  participantInfos: GroupParticipantInfo[]
}

export type AddGroupMembersRequest = {
  memberIdentityUserIds: string[]
}

export type UpdateGroupMemberRoleRequest = {
  role: GroupParticipantRole
}

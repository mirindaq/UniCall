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

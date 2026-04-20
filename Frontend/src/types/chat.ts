export type MessageType = "TEXT" | "NONTEXT" | "MIX" | "CALL"
export type AttachmentType = "IMAGE" | "VIDEO" | "AUDIO" | "FILE" | "GIF" | "STICKER" | "EMOJI" | "LINK"
export const UNICALL_AI_BOT_ID = "unicall-ai-bot"
export const UNICALL_IMAGE_BOT_ID = "unicall-image-bot"
export const UNICALL_AI_BOT_IDS = [UNICALL_AI_BOT_ID, UNICALL_IMAGE_BOT_ID] as const

export type MessageEnum = "SENT" | "RECEIVED" | "DELETED" | "FAILED"

export interface ChatMessageResponse {
  idMessage: string
  idConversation: string
  idAccountSent: string
  status: MessageEnum
  content: string
  type: MessageType
  timeSent: string
  timeUpdate: string
  replyToMessageId?: string
  edited: boolean
  recalled?: boolean
  reactions?: Record<string, string>
  reactionStacks?: Record<string, string[]>
  pinned?: boolean
  pinnedByAccountId?: string
  pinnedAt?: string
  attachments?: ChatAttachment[]
  callInfo?: ChatCallInfo
}

export type CallSignalType = "OFFER" | "ACCEPT" | "ICE_CANDIDATE" | "REJECT" | "END"
export type CallOutcome = "COMPLETED" | "NO_ANSWER" | "REJECTED" | "CANCELED"

export interface ChatCallInfo {
  callId: string
  audioOnly: boolean
  callerUserId: string
  calleeUserId: string
  endedByUserId?: string
  durationSeconds?: number
  outcome: CallOutcome
}

export interface ConversationCallSignal {
  conversationId: string
  callId: string
  type: CallSignalType
  fromUserId: string
  toUserId: string
  audioOnly: boolean
  sdp?: string
  candidate?: string
  sdpMid?: string
  sdpMLineIndex?: number
  sentAt: string
}

export type UserRealtimeEventType = "MESSAGE_UPSERT" | "CALL_SIGNAL" | "CONVERSATION_UPSERT"

export interface UserRealtimeEvent {
  eventType: UserRealtimeEventType
  conversationId: string
  sentAt: string
  message?: ChatMessageResponse
  callSignal?: ConversationCallSignal
  conversation?: ConversationResponse
}

export interface ChatAttachment {
  idAttachment: string
  type: AttachmentType
  url: string
  size?: string
  order?: number
}

export type ForwardMessageRequest = {
  targetConversationIds?: string[]
  targetUserIds?: string[]
  note?: string
}

export type ForwardMessageResponse = {
  forwardedConversationCount: number
  targetConversationIds: string[]
}

export type ConversationType = "DOUBLE" | "GROUP"
export type GroupParticipantRole = "ADMIN" | "DEPUTY" | "USER"

export interface ChatParticipantInfo {
  idAccount: string
  role: GroupParticipantRole
  nickname?: string
  dateJoin: string
}

export type GroupManagementSettings = {
  allowMemberSendMessage: boolean
  allowMemberPinMessage: boolean
  allowMemberChangeAvatar: boolean
  memberApprovalEnabled: boolean
}

export type PendingMemberRequestInfo = {
  idRequest: string
  requesterIdentityUserId: string
  targetIdentityUserId: string
  requestedAt: string
}

export interface ConversationResponse {
  idConversation: string
  type: ConversationType
  name?: string
  avatar?: string
  dateCreate: string
  dateUpdateMessage: string
  lastMessageContent?: string
  lastMessageSenderId?: string
  unreadCount?: number
  pinned?: boolean
  numberMember: number
  participantInfos: ChatParticipantInfo[]
  groupManagementSettings?: GroupManagementSettings
  pendingMemberRequestCount?: number
}

export interface ConversationBlockStatusResponse {
  conversationId: string
  directPeerId?: string
  blocked: boolean
  blockedByMe: boolean
  blockedByOther: boolean
  blockedAt?: string
}

export interface ConversationBlockStatusResponse {
  conversationId: string
  directPeerId?: string
  blocked: boolean
  blockedByMe: boolean
  blockedByOther: boolean
  blockedAt?: string
}

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
  groupManagementSettings: GroupManagementSettings
  participantInfos: GroupParticipantInfo[]
  pendingMemberRequests?: PendingMemberRequestInfo[]
  pendingMemberRequestCount?: number
  addedMemberCount?: number
  createdMemberRequestCount?: number
}

export type AddGroupMembersRequest = {
  memberIdentityUserIds: string[]
}

export type UpdateGroupMemberRoleRequest = {
  role: GroupParticipantRole
}

export type UpdateMemberNicknameRequest = {
  nickname?: string
}

export type TransferGroupAdminRequest = {
  targetIdentityUserId: string
}

export type UpdateGroupManagementSettingsRequest = GroupManagementSettings

export type UpdateGroupAvatarRequest = {
  avatar: string
}

export type DissolveGroupConversationResponse = {
  idConversation: string
  dissolved: boolean
  dissolvedAt: string
}

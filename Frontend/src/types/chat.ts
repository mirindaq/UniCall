export type MessageType = "TEXT" | "NONTEXT" | "MIX"
export type AttachmentType = "IMAGE" | "VIDEO" | "AUDIO" | "FILE" | "GIF" | "STICKER" | "EMOJI"

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
  attachments?: ChatAttachment[]
}

export interface ChatAttachment {
  idAttachment: string
  type: AttachmentType
  url: string
  size?: string
  order?: number
}

export type ConversationType = "DOUBLE" | "GROUP"

export interface ChatParticipantInfo {
  idAccount: string
  role: string
  nickname?: string
  dateJoin: string
}

export interface ConversationResponse {
  idConversation: string
  type: ConversationType
  name?: string
  avatar?: string
  dateCreate: string
  dateUpdateMessage: string
  lastMessageContent?: string
  numberMember: number
  participantInfos: ChatParticipantInfo[]
}

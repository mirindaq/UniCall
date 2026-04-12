import { formatDistanceToNow } from "date-fns"
import { vi } from "date-fns/locale"

import type { ConversationResponse } from "@/types/chat"
import type { UserProfile, UserSearchItem } from "@/types/user.type"

export function getPeerAccountId(conversation: ConversationResponse, myIdentityUserId: string): string | null {
  if (conversation.type !== "DOUBLE") {
    return null
  }
  const others =
    conversation.participantInfos?.filter((p) => p.idAccount !== myIdentityUserId) ?? []
  return others[0]?.idAccount ?? null
}

export function displayNameFromProfile(profile: Pick<UserProfile, "firstName" | "lastName"> | null | undefined) {
  if (!profile) return ""
  return `${profile.firstName} ${profile.lastName}`.trim()
}

export function formatChatSidebarTime(iso?: string | null) {
  if (!iso) return ""
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ""
    return formatDistanceToNow(d, { addSuffix: true, locale: vi })
  } catch {
    return ""
  }
}

export function formatChatMessageTime(iso?: string | null) {
  if (!iso) return ""
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ""
    return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
  } catch {
    return ""
  }
}

export function searchItemToProfile(user: UserSearchItem): UserProfile {
  return {
    id: 0,
    identityUserId: user.identityUserId,
    phoneNumber: user.phoneNumber,
    email: "",
    firstName: user.firstName,
    lastName: user.lastName,
    gender: "",
    dateOfBirth: "",
    avatar: user.avatar ?? null,
    isActive: true,
  }
}

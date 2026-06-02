import type { ChatParticipantInfo } from "@/types/chat"

export function normalizeCallParticipantId(value?: string | null): string | null {
  if (!value) {
    return null
  }
  const normalized = value.trim().toLowerCase()
  return normalized || null
}

export function participantDisplayInitials(name: string): string {
  const text = name.trim()
  if (!text || text === "Bạn") {
    return "B"
  }
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase()
  }
  return `${words[0][0] ?? ""}${words[words.length - 1][0] ?? ""}`.toUpperCase()
}

type ResolveParticipantNameOptions = {
  identityUserId: string
  currentUserId?: string | null
  participantInfos?: ChatParticipantInfo[]
  profiles?: Record<string, { displayName?: string; avatar?: string }>
}

export function resolveGroupCallParticipantName({
  identityUserId,
  currentUserId,
  participantInfos = [],
  profiles = {},
}: ResolveParticipantNameOptions): string {
  if (currentUserId && normalizeCallParticipantId(identityUserId) === normalizeCallParticipantId(currentUserId)) {
    return "Bạn"
  }

  const profileName = profiles[identityUserId]?.displayName?.trim()
  if (profileName) {
    return profileName
  }

  const participant = participantInfos.find(
    (item) => normalizeCallParticipantId(item.idAccount) === normalizeCallParticipantId(identityUserId)
  )
  const nickname = participant?.nickname?.trim()
  if (nickname) {
    return nickname
  }

  return identityUserId
}

export function buildGroupCallParticipantList(options: {
  joinedUserIds?: string[]
  invitedUserIds?: string[]
  peerUserId?: string
  currentUserId?: string | null
  participantInfos?: ChatParticipantInfo[]
  profiles?: Record<string, { displayName?: string; avatar?: string }>
}): Array<{ id: string; name: string; avatar?: string | null; isSelf: boolean }> {
  const {
    joinedUserIds = [],
    invitedUserIds = [],
    peerUserId,
    currentUserId,
    participantInfos = [],
    profiles = {},
  } = options

  const rawIds =
    joinedUserIds.length > 0 || invitedUserIds.length > 0
      ? [...joinedUserIds, ...invitedUserIds]
      : [currentUserId, peerUserId].filter((id): id is string => Boolean(id))

  const seen = new Set<string>()
  const uniqueIds: string[] = []
  for (const id of rawIds) {
    const key = normalizeCallParticipantId(id)
    if (!key || seen.has(key)) {
      continue
    }
    seen.add(key)
    uniqueIds.push(id)
  }

  const participants = uniqueIds.map((id) => {
    const isSelf = Boolean(
      currentUserId && normalizeCallParticipantId(id) === normalizeCallParticipantId(currentUserId)
    )
    return {
      id,
      name: resolveGroupCallParticipantName({
        identityUserId: id,
        currentUserId,
        participantInfos,
        profiles,
      }),
      avatar: profiles[id]?.avatar ?? null,
      isSelf,
    }
  })

  return participants.sort((left, right) => {
    if (left.isSelf) {
      return -1
    }
    if (right.isSelf) {
      return 1
    }
    return left.name.localeCompare(right.name, "vi")
  })
}

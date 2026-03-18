export type AvatarSeed = {
  image?: string
  fallback: string
  tone?: string
}

export type FriendItem = AvatarSeed & {
  id: string
  name: string
  label?: string
  status: "all" | "close" | "business"
  recentOrder: number
}

export type CommunityItem = {
  id: string
  name: string
  members: number
  category: "study" | "sports" | "technology" | "club"
  activityLabel: string
  activityOrder: number
  avatars: AvatarSeed[]
  extraMembers?: number
}

export type InvitationItem = AvatarSeed & {
  id: string
  name: string
  sentAt?: string
  mutualGroups?: number
}

export type GroupInvitationItem = {
  id: string
  communityName: string
  invitedBy: string
  members: number
  typeLabel: "Nhóm học tập" | "Cộng đồng" | "Nhóm thể thao"
  fallback: string
  tone?: string
}

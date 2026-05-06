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

export type InvitationItem = AvatarSeed & {
  id: string
  name: string
  sentAt?: string
  mutualGroups?: number
}

export type NotificationItem = {
  id: number
  type: string
  conversationId?: string | null
  conversationName?: string | null
  title: string
  content: string
  read: boolean
  createdAt: string
}

export interface AdminStat {
  key: string
  label: string
  value: string
  delta: string
  trend: "up" | "down" | "neutral"
}

export interface AdminUser {
  id: string
  phoneNumber: string
  fullName: string
  status: "ACTIVE" | "SUSPENDED" | "PENDING"
  verified: boolean
  joinedAt: string
  reports: number
}

export interface ConversationOverview {
  id: string
  type: "DIRECT" | "GROUP"
  title: string
  participants: number
  messages24h: number
  flaggedMessages: number
}

export interface GroupOverview {
  id: string
  name: string
  members: number
  admins: number
  pendingApprovals: number
  riskLevel: "LOW" | "MEDIUM" | "HIGH"
}

export interface ModerationQueueItem {
  id: string
  contentType: "TEXT" | "IMAGE" | "FILE"
  reporter: string
  reason: string
  severity: "LOW" | "MEDIUM" | "HIGH"
  createdAt: string
}

export interface ReportSummary {
  id: string
  category: string
  open: number
  inProgress: number
  resolvedToday: number
}

export interface BroadcastCampaign {
  id: string
  title: string
  audience: string
  status: "DRAFT" | "SCHEDULED" | "SENT"
  deliveryRate: string
  scheduledAt: string
}

export interface SupportTicket {
  id: string
  requester: string
  subject: string
  priority: "LOW" | "MEDIUM" | "HIGH"
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED"
  createdAt: string
}

export interface RolePermission {
  id: string
  roleName: string
  members: number
  scopes: string[]
}

export interface SystemSetting {
  key: string
  label: string
  value: string
  updatedAt: string
}

export interface AuditLog {
  id: string
  actor: string
  action: string
  target: string
  createdAt: string
  ipAddress: string
}

import type {
  AdminStat,
  AdminUser,
  AuditLog,
  BroadcastCampaign,
  ConversationOverview,
  GroupOverview,
  ModerationQueueItem,
  ReportSummary,
  RolePermission,
  SupportTicket,
  SystemSetting,
} from "@/types/admin"

export const adminStats: AdminStat[] = [
  { key: "dau", label: "Người dùng hoạt động/ngày", value: "128.430", delta: "+5,8%", trend: "up" },
  { key: "msgs", label: "Tin nhắn/ngày", value: "3,2 triệu", delta: "+2,1%", trend: "up" },
  { key: "reports", label: "Báo cáo đang mở", value: "426", delta: "-8,4%", trend: "down" },
  { key: "uptime", label: "Uptime thời gian thực", value: "99,96%", delta: "ổn định", trend: "neutral" },
]

export const adminUsers: AdminUser[] = [
  { id: "U1001", phoneNumber: "0987654321", fullName: "Nguyễn Văn An", status: "ACTIVE", verified: true, joinedAt: "10/03/2026", reports: 0 },
  { id: "U1002", phoneNumber: "0912345678", fullName: "Trần Thu Hà", status: "SUSPENDED", verified: true, joinedAt: "23/01/2026", reports: 4 },
  { id: "U1003", phoneNumber: "0933555777", fullName: "Lê Quốc Khang", status: "PENDING", verified: false, joinedAt: "16/03/2026", reports: 1 },
  { id: "U1004", phoneNumber: "0977333111", fullName: "Phạm Minh Châu", status: "ACTIVE", verified: true, joinedAt: "08/12/2025", reports: 0 },
]

export const conversationOverviews: ConversationOverview[] = [
  { id: "C2001", type: "DIRECT", title: "An <-> Hà", participants: 2, messages24h: 342, flaggedMessages: 0 },
  { id: "C2002", type: "GROUP", title: "Đội phát triển UniCall", participants: 18, messages24h: 1023, flaggedMessages: 2 },
  { id: "C2003", type: "GROUP", title: "Chợ đồ sinh viên", participants: 326, messages24h: 2811, flaggedMessages: 18 },
]

export const groupOverviews: GroupOverview[] = [
  { id: "G3001", name: "UniCall Product", members: 54, admins: 4, pendingApprovals: 2, riskLevel: "LOW" },
  { id: "G3002", name: "Trao đổi đồ Sài Gòn", members: 1432, admins: 6, pendingApprovals: 23, riskLevel: "HIGH" },
  { id: "G3003", name: "Tân sinh viên 2026", members: 812, admins: 5, pendingApprovals: 11, riskLevel: "MEDIUM" },
]

export const moderationQueue: ModerationQueueItem[] = [
  { id: "M4001", contentType: "TEXT", reporter: "U1992", reason: "Quấy rối", severity: "HIGH", createdAt: "17/03/2026 08:12" },
  { id: "M4002", contentType: "IMAGE", reporter: "U1821", reason: "Nội dung nhạy cảm", severity: "HIGH", createdAt: "17/03/2026 09:02" },
  { id: "M4003", contentType: "FILE", reporter: "U1201", reason: "Liên kết mã độc", severity: "MEDIUM", createdAt: "17/03/2026 10:22" },
]

export const reportSummaries: ReportSummary[] = [
  { id: "R5001", category: "Spam", open: 114, inProgress: 42, resolvedToday: 88 },
  { id: "R5002", category: "Lừa đảo", open: 39, inProgress: 17, resolvedToday: 21 },
  { id: "R5003", category: "Lạm dụng", open: 61, inProgress: 23, resolvedToday: 44 },
]

export const broadcastCampaigns: BroadcastCampaign[] = [
  { id: "B6001", title: "Cập nhật ứng dụng 2.4", audience: "Toàn bộ người dùng", status: "SENT", deliveryRate: "98,9%", scheduledAt: "15/03/2026 21:00" },
  { id: "B6002", title: "Cảnh báo chống lừa đảo OTP", audience: "Người dùng Việt Nam", status: "SCHEDULED", deliveryRate: "-", scheduledAt: "18/03/2026 09:00" },
  { id: "B6003", title: "Cập nhật chính sách nhóm", audience: "Quản trị viên nhóm", status: "DRAFT", deliveryRate: "-", scheduledAt: "Chưa lên lịch" },
]

export const supportTickets: SupportTicket[] = [
  { id: "T7001", requester: "U2008", subject: "Không nhận được OTP", priority: "HIGH", status: "IN_PROGRESS", createdAt: "17/03/2026 07:41" },
  { id: "T7002", requester: "U1091", subject: "Khôi phục tài khoản", priority: "MEDIUM", status: "OPEN", createdAt: "17/03/2026 09:17" },
  { id: "T7003", requester: "U3451", subject: "Xử lý báo cáo chậm", priority: "LOW", status: "RESOLVED", createdAt: "16/03/2026 16:08" },
]

export const rolePermissions: RolePermission[] = [
  { id: "P8001", roleName: "Super Admin", members: 2, scopes: ["*.*"] },
  { id: "P8002", roleName: "Tin cậy & An toàn", members: 11, scopes: ["reports.read", "moderation.review", "users.suspend"] },
  { id: "P8003", roleName: "Nhân viên hỗ trợ", members: 27, scopes: ["tickets.read", "tickets.update"] },
]

export const systemSettings: SystemSetting[] = [
  { key: "otp.ttl", label: "Thời gian hết hạn OTP (giây)", value: "90", updatedAt: "14/03/2026 10:22" },
  { key: "message.recall", label: "Thời gian thu hồi tin nhắn (phút)", value: "2", updatedAt: "11/03/2026 14:03" },
  { key: "media.max_size", label: "Dung lượng media tối đa (MB)", value: "50", updatedAt: "09/03/2026 18:31" },
  { key: "spam.threshold", label: "Ngưỡng điểm spam", value: "0.78", updatedAt: "16/03/2026 12:44" },
]

export const auditLogs: AuditLog[] = [
  { id: "A9001", actor: "admin.root", action: "TẠM_KHOÁ_NGƯỜI_DÙNG", target: "U1002", createdAt: "17/03/2026 08:20", ipAddress: "10.8.1.19" },
  { id: "A9002", actor: "mod.lead", action: "GỠ_NỘI_DUNG", target: "M4002", createdAt: "17/03/2026 09:14", ipAddress: "10.8.1.33" },
  { id: "A9003", actor: "support.ops", action: "CẬP_NHẬT_TICKET", target: "T7001", createdAt: "17/03/2026 10:09", ipAddress: "10.8.1.45" },
]

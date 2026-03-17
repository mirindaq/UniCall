import { Badge } from "@/components/ui/badge"
import { AdminDataPageTemplate } from "@/components/admin/AdminDataPageTemplate"
import { conversationOverviews } from "@/mock/admin-data"
import { adminMockService } from "@/services/admin/admin.mock.service"
import { toast } from "sonner"

export function AdminConversationsPage() {
  const handleAction = async () => {
    const response = await adminMockService.throttleConversation(conversationOverviews[2].id)
    toast.success(response.message)
  }

  return (
    <AdminDataPageTemplate
      title="Quản lý hội thoại"
      description="Theo dõi lưu lượng chat 1-1 và nhóm để đảm bảo ổn định hệ thống."
      tableTitle="Sức khỏe hội thoại"
      tableDescription="Lưu lượng 24h và tỷ lệ nội dung bị gắn cờ."
      actionLabel="Giới hạn hội thoại mẫu"
      onAction={handleAction}
      onExport={() => toast.success("Đã xuất dữ liệu hội thoại (mock)")}
      rows={conversationOverviews}
      columns={[
        { key: "id", title: "Mã hội thoại", render: (row) => row.id },
        { key: "type", title: "Loại", render: (row) => <Badge variant="outline">{row.type === "DIRECT" ? "1-1" : "Nhóm"}</Badge> },
        { key: "title", title: "Tiêu đề", render: (row) => row.title },
        { key: "participants", title: "Thành viên", render: (row) => row.participants },
        { key: "messages", title: "Tin nhắn (24h)", render: (row) => row.messages24h },
        { key: "flagged", title: "Nội dung bị gắn cờ", render: (row) => row.flaggedMessages },
      ]}
    />
  )
}

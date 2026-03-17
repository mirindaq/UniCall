import { Badge } from "@/components/ui/badge"
import { AdminDataPageTemplate } from "@/components/admin/AdminDataPageTemplate"
import { broadcastCampaigns } from "@/mock/admin-data"
import { adminMockService } from "@/services/admin/admin.mock.service"
import { toast } from "sonner"

export function AdminBroadcastsPage() {
  const handleAction = async () => {
    const response = await adminMockService.sendBroadcast(broadcastCampaigns[0].id)
    toast.success(response.message)
  }

  return (
    <AdminDataPageTemplate
      title="Chiến dịch thông báo"
      description="Quản lý thông báo hệ thống, bảo trì và cập nhật sản phẩm."
      tableTitle="Lịch chiến dịch"
      tableDescription="Danh sách nháp, đã lên lịch và đã gửi."
      actionLabel="Gửi chiến dịch mẫu"
      onAction={handleAction}
      onExport={() => toast.success("Đã xuất chiến dịch thông báo (mock)")}
      rows={broadcastCampaigns}
      columns={[
        { key: "id", title: "Mã chiến dịch", render: (row) => row.id },
        { key: "title", title: "Tiêu đề", render: (row) => row.title },
        { key: "audience", title: "Đối tượng nhận", render: (row) => row.audience },
        {
          key: "status",
          title: "Trạng thái",
          render: (row) => (
            <Badge variant={row.status === "SENT" ? "secondary" : row.status === "SCHEDULED" ? "outline" : "default"}>
              {row.status === "SENT" ? "Đã gửi" : row.status === "SCHEDULED" ? "Đã lên lịch" : "Bản nháp"}
            </Badge>
          ),
        },
        { key: "delivery", title: "Tỷ lệ gửi", render: (row) => row.deliveryRate },
        { key: "scheduled", title: "Lịch gửi", render: (row) => row.scheduledAt },
      ]}
    />
  )
}

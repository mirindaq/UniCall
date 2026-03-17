import { Badge } from "@/components/ui/badge"
import { adminStats, moderationQueue, supportTickets } from "@/mock/admin-data"
import { AdminPageHeader } from "@/components/admin/AdminPageHeader"
import { AdminStatCard } from "@/components/admin/AdminStatCard"
import { Button } from "@/components/ui/button"
import { adminMockService } from "@/services/admin/admin.mock.service"
import { toast } from "sonner"

export function AdminDashboardPage() {
  const handleEmergencyEndCall = async () => {
    const response = await adminMockService.forceEndCallRoom("ROOM-999")
    toast.success(response.message)
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Bảng điều khiển quản trị"
        description="Tổng quan KPI thời gian thực, áp lực kiểm duyệt và tải hỗ trợ."
        action={<Button onClick={handleEmergencyEndCall}>Kết thúc phòng gọi khẩn</Button>}
      />

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {adminStats.map((stat) => (
          <AdminStatCard key={stat.key} stat={stat} />
        ))}
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="mb-3 text-base font-semibold text-slate-900">Ảnh chụp nhanh hàng chờ kiểm duyệt</p>
          <div className="space-y-2">
            {moderationQueue.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-slate-900">{item.reason}</p>
                  <p className="text-xs text-slate-500">{item.id} • {item.createdAt}</p>
                </div>
                <Badge variant={item.severity === "HIGH" ? "destructive" : "secondary"}>{item.severity}</Badge>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="mb-3 text-base font-semibold text-slate-900">Theo dõi SLA hỗ trợ</p>
          <div className="space-y-2">
            {supportTickets.map((ticket) => (
              <div key={ticket.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-slate-900">{ticket.subject}</p>
                  <p className="text-xs text-slate-500">{ticket.id} • {ticket.requester}</p>
                </div>
                <Badge variant={ticket.status === "RESOLVED" ? "secondary" : "default"}>
                  {ticket.status === "OPEN" ? "Mới" : ticket.status === "IN_PROGRESS" ? "Đang xử lý" : "Đã hoàn tất"}
                </Badge>
              </div>
            ))}
          </div>
        </section>
      </section>
    </div>
  )
}

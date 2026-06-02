import { useMemo } from "react"
import { toast } from "sonner"

import { AdminPageHeader } from "@/components/admin/AdminPageHeader"
import { AdminStatCard } from "@/components/admin/AdminStatCard"
import { Button } from "@/components/ui/button"
import { useQuery } from "@/hooks/useQuery"
import { userService } from "@/services/user/user.service"
import type { PageResponse, ResponseSuccess } from "@/types/api-response"
import type { AdminManagedUser, AdminStat } from "@/types/admin"

const DASHBOARD_PAGE_SIZE = 100

async function fetchAllAdminUsers() {
  const firstPageResponse = await userService.getAdminUsers({
    page: 1,
    limit: DASHBOARD_PAGE_SIZE,
  })

  const totalPage = Math.max(firstPageResponse.data.totalPage, 1)
  let items: AdminManagedUser[] = [...firstPageResponse.data.items]

  if (totalPage > 1) {
    const remainingResponses = await Promise.all(
      Array.from({ length: totalPage - 1 }, (_, index) =>
        userService.getAdminUsers({
          page: index + 2,
          limit: DASHBOARD_PAGE_SIZE,
        })
      )
    )

    items = items.concat(
      remainingResponses.flatMap(
        (response: ResponseSuccess<PageResponse<AdminManagedUser>>) =>
          response.data.items
      )
    )
  }

  return {
    totalUsers: firstPageResponse.data.totalItem,
    users: items,
  }
}

export function AdminDashboardPage() {
  const {
    data: dashboardData,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery(fetchAllAdminUsers, {
    onError: () => {
      toast.error("Không thể tải thống kê admin")
    },
  })

  const stats = useMemo<AdminStat[]>(() => {
    const users = dashboardData?.users ?? []
    const totalUsers = dashboardData?.totalUsers ?? 0
    const activeUsers = users.filter((user) => user.isActive).length
    const blockedUsers = users.filter((user) => !user.isActive).length
    const pendingDeletionUsers = users.filter((user) => user.deletionPending).length

    return [
      {
        key: "total-users",
        label: "Tổng tài khoản",
        value: totalUsers.toString(),
        delta: "Dữ liệu thực từ hệ thống",
        trend: "neutral",
      },
      {
        key: "active-users",
        label: "Tài khoản hoạt động",
        value: activeUsers.toString(),
        delta: "Đang sử dụng bình thường",
        trend: "up",
      },
      {
        key: "blocked-users",
        label: "Tài khoản bị chặn",
        value: blockedUsers.toString(),
        delta: "Cần theo dõi nếu tăng nhanh",
        trend: blockedUsers > 0 ? "down" : "neutral",
      },
      {
        key: "pending-deletion",
        label: "Chờ xóa tài khoản",
        value: pendingDeletionUsers.toString(),
        delta: "Đang chờ xử lý xóa",
        trend: pendingDeletionUsers > 0 ? "down" : "neutral",
      },
    ]
  }, [dashboardData?.totalUsers, dashboardData?.users])

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Bảng điều khiển quản trị"
        description="Tổng quan nhanh tình trạng tài khoản người dùng."
        action={
          <Button onClick={() => void refetch()} disabled={isLoading || isRefetching}>
            {isLoading || isRefetching ? "Đang tải..." : "Làm mới"}
          </Button>
        }
      />

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <AdminStatCard key={stat.key} stat={stat} />
        ))}
      </section>
    </div>
  )
}

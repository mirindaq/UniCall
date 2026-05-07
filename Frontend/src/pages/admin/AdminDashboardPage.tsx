import { useMemo } from "react"
import { toast } from "sonner"

import { AdminPageHeader } from "@/components/admin/AdminPageHeader"
import { AdminStatCard } from "@/components/admin/AdminStatCard"
import { Button } from "@/components/ui/button"
import { useQuery } from "@/hooks/useQuery"
import { userService } from "@/services/user/user.service"
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
      remainingResponses.flatMap((response) => response.data.items)
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
      toast.error("Khong the tai thong ke admin")
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
        label: "Tong tai khoan",
        value: totalUsers.toString(),
        delta: "Du lieu thuc tu he thong",
        trend: "neutral",
      },
      {
        key: "active-users",
        label: "Tai khoan hoat dong",
        value: activeUsers.toString(),
        delta: "Dang su dung binh thuong",
        trend: "up",
      },
      {
        key: "blocked-users",
        label: "Tai khoan bi chan",
        value: blockedUsers.toString(),
        delta: "Can theo doi neu tang nhanh",
        trend: blockedUsers > 0 ? "down" : "neutral",
      },
      {
        key: "pending-deletion",
        label: "Cho xoa tai khoan",
        value: pendingDeletionUsers.toString(),
        delta: "Dang cho xu ly xoa",
        trend: pendingDeletionUsers > 0 ? "down" : "neutral",
      },
    ]
  }, [dashboardData?.totalUsers, dashboardData?.users])

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Bang dieu khien quan tri"
        description="Tong quan nhanh tinh trang tai khoan nguoi dung."
        action={
          <Button onClick={() => void refetch()} disabled={isLoading || isRefetching}>
            {isLoading || isRefetching ? "Dang tai..." : "Lam moi"}
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

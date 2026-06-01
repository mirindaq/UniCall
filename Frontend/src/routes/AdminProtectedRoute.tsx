import { useEffect, useState, type ReactNode } from "react"
import { Navigate, useLocation } from "react-router"
import { Loader2 } from "lucide-react"

import { ADMIN_PATH } from "@/constants/admin"
import { AUTH_PATH } from "@/constants/auth"
import { useAuth } from "@/contexts/auth-context"
import { authService } from "@/services/auth/auth.service"
import { userService } from "@/services/user/user.service"

interface AdminProtectedRouteProps {
  children: ReactNode
}

export default function AdminProtectedRoute({
  children,
}: AdminProtectedRouteProps) {
  const { isAuthenticated, clearAuthenticated } = useAuth()
  const location = useLocation()
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    const check = async () => {
      try {
        if (!isAuthenticated) {
          await authService.refreshAccessToken()
        }
        const profile = await userService.getMyProfile()
        const userRole = profile.data.role ?? null
        if (mounted) {
          setRole(userRole)
          setLoading(false)
        }
      } catch {
        clearAuthenticated()
        if (mounted) setLoading(false)
      }
    }

    check()
    return () => {
      mounted = false
    }
  }, [clearAuthenticated, isAuthenticated])

  useEffect(() => {
    if (!loading && role !== "ADMIN") {
      authService.logout().catch(() => {})
      clearAuthenticated()
    }
  }, [loading, role, clearAuthenticated])

  if (loading) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-slate-50 px-4">
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 text-slate-700 shadow-sm">
          <Loader2 className="size-4 animate-spin" />
          Dang xac thuc phien...
        </div>
      </main>
    )
  }

  if (!isAuthenticated || role !== "ADMIN") {
    return <Navigate to={AUTH_PATH.LOGIN} state={{ from: location }} replace />
  }

  return <>{children}</>
}
